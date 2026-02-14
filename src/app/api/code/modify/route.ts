import { NextRequest, NextResponse } from 'next/server';
import { createClaudeAgent } from '@/lib/agents/claude-agent';
import { createGitManager } from '@/lib/code-modification/git-manager';
import { createMigrationManager } from '@/lib/code-modification/migration-manager';
import { runTests } from '@/lib/code-modification/test-runner';

/**
 * POST /api/code/modify
 *
 * Main orchestrator endpoint for code modifications using Claude Agent SDK.
 *
 * New Flow (Agent SDK):
 * 1. Receive user request
 * 2. Call Claude Agent SDK - Claude directly modifies files in staging
 * 3. Check git status for modified files
 * 4. Handle database migrations if schema changed
 * 5. Create git commit
 * 6. Run automated tests
 * 7. Return results
 *
 * Request body:
 * {
 *   "message": "User request in natural language",
 *   "conversationHistory": [...], // Optional
 *   "skipTests": false // Optional - for testing only
 *   "sessionId": "session_abc123" // Optional - to continue conversation
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request
    const body = await request.json();
    const { message, conversationHistory, skipTests = false, sessionId } = body;

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
    const projectRoot = process.cwd();
    const claudeAgent = createClaudeAgent(projectRoot);
    const gitManager = createGitManager(projectRoot);
    const migrationManager = createMigrationManager(projectRoot);
    console.log('✓ Services initialized');

    // Get initial git status to track changes
    const initialStatus = await gitManager.getStatus();
    const initialFiles = new Set([
      ...initialStatus.data.modified,
      ...initialStatus.data.created,
    ]);

    // Step 2: Claude Agent SDK modifies files directly
    console.log('\n[Step 2/5] Claude Agent modifying files...');
    const modificationResult = await claudeAgent.modifyCode({
      userRequest: message,
      conversationHistory,
      sessionId,
    });

    if (!modificationResult.success) {
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
      });
    }

    // Step 3: Handle database migrations if schema changed
    const schemaModified = uniqueModifiedFiles.some((f) =>
      f.includes('schema.prisma')
    );

    if (schemaModified) {
      console.log('\n[Step 3/5] Database schema modified - generating migration...');
      const migrationResult = await migrationManager.handleSchemaChange(
        `ai_generated_${Date.now()}`
      );

      if (!migrationResult.success) {
        console.error('✗ Migration failed:', migrationResult.error);

        // Rollback file changes
        console.log('Rolling back file changes...');
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
    } else {
      console.log('\n[Step 3/5] No database schema changes');
    }

    // Step 4: Create git commit
    console.log('\n[Step 4/5] Creating git commit...');

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
    } else {
      console.log('⚠ No changes to commit');
      commitResult = { success: true, data: { commit: null } };
    }

    // Step 5: Run automated tests (unless skipped)
    let testResults = null;
    if (!skipTests) {
      console.log('\n[Step 5/5] Running automated tests...');

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

          // Rollback changes if we made a commit
          if (commitResult.data.commit) {
            console.log('Rolling back commit...');
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
      } catch (error) {
        console.error('✗ Test execution failed:', error);
        // Continue anyway - tests might have issues
      }
    } else {
      console.log('\n[Step 5/5] Skipping tests (skipTests=true)');
    }

    // Success!
    const duration = Date.now() - startTime;
    console.log('\n✓ Code modification complete!');
    console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      message: 'Code modifications applied successfully',
      data: {
        result: modificationResult.result,
        sessionId: modificationResult.sessionId,
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
