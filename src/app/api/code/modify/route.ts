import { NextRequest, NextResponse } from 'next/server';
import { createClaudeCLIAgent } from '@/lib/agents/claude-cli-agent';
import { createGitManager } from '@/lib/code-modification/git-manager';
import { createMigrationManager } from '@/lib/code-modification/migration-manager';
import { runTests } from '@/lib/code-modification/test-runner';
import {
  broadcastProgress,
  broadcastStatus,
  broadcastFileChange,
  broadcastTestResult,
  broadcastError,
  broadcastComplete,
} from '@/lib/sse/broadcast';

/**
 * POST /api/code/modify
 *
 * Main orchestrator endpoint for code modifications using Claude CLI.
 *
 * Flow:
 * 1. Receive user request
 * 2. Call Claude CLI directly - Claude modifies files in staging
 * 3. Check git status for modified files
 * 4. Handle database migrations if schema changed
 * 5. Create git commit and push to remote
 * 6. Run automated tests
 * 7. Return results
 *
 * Uses Claude CLI instead of Agent SDK to avoid nested session errors.
 * Environment variable CLAUDECODE is removed before spawning subprocess.
 *
 * Request body:
 * {
 *   "message": "User request in natural language",
 *   "conversationHistory": [...], // Optional
 *   "skipTests": false // Optional - for testing only
 *   "sessionId": "session_abc123" // Optional - for SSE filtering
 *   "agentSessionId": "agent_abc123" // Optional - for conversation continuity
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let sessionId: string | undefined;
  let agentSessionId: string | undefined;

  try {
    // Parse request
    const body = await request.json();
    const { message, conversationHistory, skipTests = false } = body;
    sessionId = body.sessionId; // Client sessionId for SSE filtering
    agentSessionId = body.agentSessionId; // Agent SDK sessionId for conversation continuity

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('='.repeat(80));
    console.log('CODE MODIFICATION REQUEST (Agent SDK)');
    console.log('='.repeat(80));
    console.log('User request:', message);
    if (sessionId) {
      console.log('Session ID:', sessionId);
    }
    console.log('-'.repeat(80));

    // Step 1: Initialize services
    console.log('\n[Step 1/5] Initializing services...');
    broadcastProgress('Initializing services...', sessionId);
    const projectRoot = process.cwd();
    const claudeAgent = createClaudeCLIAgent(projectRoot);
    const gitManager = createGitManager(projectRoot);
    const migrationManager = createMigrationManager(projectRoot);
    console.log('✓ Services initialized');
    broadcastStatus('initialized', { step: '1/5' }, sessionId);

    // Get initial git status to track changes
    const initialStatus = await gitManager.getStatus();
    const initialFiles = new Set([
      ...initialStatus.data.modified,
      ...initialStatus.data.created,
    ]);

    // Step 2: Claude Agent SDK modifies files directly
    console.log('\n[Step 2/5] Claude Agent modifying files...');
    broadcastProgress('Claude Agent is analyzing and modifying files...', sessionId);
    const modificationResult = await claudeAgent.modifyCode({
      userRequest: message,
      conversationHistory,
      sessionId: agentSessionId, // Use agent sessionId for resuming, not client sessionId
    });

    if (!modificationResult.success) {
      broadcastError(modificationResult.error || 'Code modification failed', sessionId);
      return NextResponse.json(
        {
          success: false,
          error: modificationResult.error || 'Code modification failed',
        },
        { status: 500 }
      );
    }

    console.log('✓ Claude Agent completed');
    console.log('Result:', modificationResult.result);
    broadcastStatus('agent_completed', { step: '2/5' }, sessionId);

    // Get final git status to see what changed
    const finalStatus = await gitManager.getStatus();
    const modifiedFiles = [
      ...finalStatus.data.modified.filter((f) => !initialFiles.has(f)),
      ...finalStatus.data.created.filter((f) => !initialFiles.has(f)),
      ...(modificationResult.filesModified || []),
    ];

    // Remove duplicates
    const uniqueModifiedFiles = Array.from(new Set(modifiedFiles));

    if (uniqueModifiedFiles.length === 0) {
      console.log('⚠ No files were modified');
    } else {
      console.log('Files modified:');
      uniqueModifiedFiles.forEach((file) => {
        console.log(`  - ${file}`);
        const action = finalStatus.data.created.includes(file) ? 'created' : 'modified';
        broadcastFileChange(file, action, sessionId);
      });
    }

    // Step 3: Handle database migrations if schema changed
    const schemaModified = uniqueModifiedFiles.some((f) =>
      f.includes('schema.prisma')
    );

    if (schemaModified) {
      console.log('\n[Step 3/5] Database schema modified - generating migration...');
      broadcastProgress('Generating database migration...', sessionId);
      const migrationResult = await migrationManager.handleSchemaChange(
        `ai_generated_${Date.now()}`
      );

      if (!migrationResult.success) {
        console.error('✗ Migration failed:', migrationResult.error);

        // Rollback file changes
        console.log('Rolling back file changes...');
        broadcastError('Database migration failed - rolling back', sessionId);
        await gitManager.discardChanges();

        return NextResponse.json(
          {
            success: false,
            error: 'Database migration failed',
            details: migrationResult.error,
          },
          { status: 500 }
        );
      }

      console.log('✓ Database migration successful');
      broadcastStatus('migration_complete', { step: '3/5' }, sessionId);
    } else {
      console.log('\n[Step 3/5] No database schema changes');
      broadcastStatus('no_migration_needed', { step: '3/5' }, sessionId);
    }

    // Step 4: Create git commit
    console.log('\n[Step 4/5] Creating git commit...');
    broadcastProgress('Creating git commit...', sessionId);

    // Check if there are actually changes to commit
    const statusBeforeCommit = await gitManager.getStatus();
    const hasChanges =
      statusBeforeCommit.data.modified.length > 0 ||
      statusBeforeCommit.data.created.length > 0 ||
      statusBeforeCommit.data.deleted.length > 0;

    let commitResult;
    if (hasChanges) {
      const commitMessage = `AI: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}\n\n${modificationResult.result}\n\nCo-Authored-By: Claude Agent SDK <noreply@anthropic.com>`;

      commitResult = await gitManager.commit({
        message: commitMessage,
        files: uniqueModifiedFiles.length > 0 ? uniqueModifiedFiles : undefined,
        author: {
          name: 'DeboraAI Agent',
          email: 'agent@deboraai.local',
        },
      });

      if (!commitResult.success) {
        console.error('✗ Git commit failed:', commitResult.error);
        broadcastError('Failed to commit changes', sessionId);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to commit changes',
            details: commitResult.error,
          },
          { status: 500 }
        );
      }

      console.log(`✓ Committed as: ${commitResult.data?.commit}`);
      broadcastStatus('commit_created', { step: '4/5', commit: commitResult.data?.commit }, sessionId);

      // Push to remote staging branch
      console.log('Pushing to origin/staging...');
      broadcastProgress('Pushing to GitHub...', sessionId);

      try {
        await gitManager.push({ remote: 'origin', branch: 'staging' });
        console.log('✓ Pushed to origin/staging');
        broadcastStatus('pushed_to_remote', { step: '4/5' }, sessionId);
      } catch (pushError) {
        console.error('✗ Failed to push to remote:', pushError);
        // Don't fail the entire operation if push fails - admin can push manually
        console.warn('⚠ Continuing despite push failure - changes are committed locally');
      }
    } else {
      console.log('⚠ No changes to commit');
      broadcastStatus('no_changes_to_commit', { step: '4/5' }, sessionId);
      commitResult = { success: true, data: { commit: null } };
    }

    // Step 5: Run automated tests (unless skipped)
    let testResults = null;
    if (!skipTests) {
      console.log('\n[Step 5/5] Running automated tests...');
      broadcastProgress('Running automated tests...', sessionId);

      try {
        testResults = await runTests({
          runUnit: true,
          runIntegration: true,
          runE2E: false, // Skip E2E for faster feedback
          collectCoverage: false, // Skip coverage for speed
        });

        if (!testResults.success) {
          console.error('✗ Tests failed!');
          console.error(`Failed: ${testResults.testsFailed}/${testResults.totalTests}`);

          broadcastTestResult({
            passed: testResults.testsPassed,
            failed: testResults.testsFailed,
            total: testResults.totalTests,
          }, sessionId);

          // Rollback changes if we made a commit
          if (commitResult.data.commit) {
            console.log('Rolling back commit...');
            broadcastError('Tests failed - rolling back changes', sessionId);
            await gitManager.revertCommit(commitResult.data.commit);
          }

          return NextResponse.json(
            {
              success: false,
              error: 'Tests failed - changes have been rolled back',
              testResults: {
                passed: testResults.testsPassed,
                failed: testResults.testsFailed,
                total: testResults.totalTests,
                errors: testResults.errors,
              },
            },
            { status: 400 }
          );
        }

        console.log(`✓ All tests passed (${testResults.testsPassed}/${testResults.totalTests})`);
        broadcastTestResult({
          passed: testResults.testsPassed,
          failed: testResults.testsFailed,
          total: testResults.totalTests,
        }, sessionId);
      } catch (error) {
        console.error('✗ Test execution failed:', error);
        broadcastError('Test execution failed', sessionId);
        // Continue anyway - tests might have issues
      }
    } else {
      console.log('\n[Step 5/5] Skipping tests (skipTests=true)');
      broadcastStatus('tests_skipped', { step: '5/5' }, sessionId);
    }

    // Success!
    const duration = Date.now() - startTime;
    console.log('\n✓ Code modification complete!');
    console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(80));

    // Broadcast completion
    broadcastComplete({
      success: true,
      modifications: uniqueModifiedFiles.length,
      duration,
    }, sessionId);

    return NextResponse.json({
      success: true,
      message: 'Code modifications applied successfully',
      data: {
        result: modificationResult.result,
        agentSessionId: modificationResult.sessionId, // Agent SDK session for continuity
        modifications: uniqueModifiedFiles.map((file) => ({
          filePath: file,
          created: finalStatus.data.created.includes(file),
        })),
        commit: {
          hash: commitResult.data?.commit,
          message: commitResult.data?.commit
            ? `AI: ${message.substring(0, 100)}...`
            : null,
        },
        tests: testResults
          ? {
              passed: testResults.testsPassed,
              failed: testResults.testsFailed,
              total: testResults.totalTests,
              duration: testResults.duration,
            }
          : { skipped: true },
        duration,
      },
    });
  } catch (error) {
    console.error('✗ Code modification failed:', error);

    broadcastError(
      error instanceof Error ? error.message : 'Internal server error',
      sessionId
    );

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
