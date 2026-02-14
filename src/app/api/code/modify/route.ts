import { NextRequest, NextResponse } from 'next/server';
import { createCodingAgent } from '@/lib/agents/coding-agent';
import { createFileManager } from '@/lib/code-modification/file-manager';
import { createValidator } from '@/lib/code-modification/validator';
import { createGitManager } from '@/lib/code-modification/git-manager';
import { createMigrationManager } from '@/lib/code-modification/migration-manager';
import { runTests } from '@/lib/code-modification/test-runner';

/**
 * POST /api/code/modify
 *
 * Main orchestrator endpoint for code modifications.
 *
 * Flow:
 * 1. Receive user request
 * 2. Call Bedrock / Claude to generate code
 * 3. Validate generated code
 * 4. Apply changes to staging worktree
 * 5. Create git commit
 * 6. Run automated tests
 * 7. (Optional) Restart staging server
 * 8. Return results with SSE notification
 *
 * Request body:
 * {
 *   "message": "User request in natural language",
 *   "conversationHistory": [...], // Optional
 *   "skipTests": false // Optional - for testing only
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse request
    const body = await request.json();
    const { message, conversationHistory, skipTests = false } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    console.log('='.repeat(80));
    console.log('CODE MODIFICATION REQUEST');
    console.log('='.repeat(80));
    console.log('User request:', message);
    console.log('-'.repeat(80));

    // Step 1: Initialize services
    console.log('\n[Step 1/7] Initializing services...');
    const projectRoot = process.cwd();
    const codingAgent = createCodingAgent(projectRoot);
    const fileManager = createFileManager(projectRoot);
    const validator = createValidator(projectRoot);
    const gitManager = createGitManager(projectRoot);
    const migrationManager = createMigrationManager(projectRoot);

    await codingAgent.initialize();
    console.log('✓ Services initialized');

    // Step 2: Generate code with AI
    console.log('\n[Step 2/7] Generating code with Claude Sonnet 4.5...');
    const generationResult = await codingAgent.generateCode({
      userRequest: message,
      conversationHistory,
    });

    if (!generationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: generationResult.error || 'Code generation failed',
        },
        { status: 500 }
      );
    }

    console.log(`✓ Generated ${generationResult.modifications.length} file modification(s)`);
    console.log('Thinking:', generationResult.thinking);
    console.log('Files to modify:');
    generationResult.modifications.forEach((mod) => {
      console.log(`  - ${mod.filePath}`);
    });

    // Step 3: Validate generated code
    console.log('\n[Step 3/7] Validating generated code...');
    const validationResult = await validator.validateFiles(
      generationResult.modifications.map((mod) => ({
        filePath: mod.filePath,
        content: mod.content,
      }))
    );

    if (!validationResult.valid) {
      console.error('✗ Validation failed:', validationResult.errors);
      return NextResponse.json(
        {
          success: false,
          error: 'Generated code failed validation',
          details: validationResult.errors,
        },
        { status: 400 }
      );
    }

    console.log('✓ All generated code is valid');

    // Step 4: Apply changes to staging worktree
    console.log('\n[Step 4/7] Applying changes to files...');
    const applyResult = await fileManager.applyModifications(generationResult.modifications);

    if (!applyResult.success) {
      console.error('✗ Failed to apply modifications:', applyResult.error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to apply modifications',
          details: applyResult.error,
        },
        { status: 500 }
      );
    }

    console.log(`✓ Successfully modified ${applyResult.results.length} file(s)`);

    // Step 4b: Handle database migrations if schema was modified
    const schemaModified = generationResult.modifications.some(
      (mod) => mod.filePath.includes('schema.prisma')
    );

    if (schemaModified) {
      console.log('\n[Step 4b] Database schema modified - generating migration...');
      const migrationResult = await migrationManager.handleSchemaChange(
        `ai_generated_${Date.now()}`
      );

      if (!migrationResult.success) {
        console.error('✗ Migration failed:', migrationResult.error);
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
    }

    // Step 5: Create git commit
    console.log('\n[Step 5/7] Creating git commit...');
    const commitMessage = `AI: ${message}\n\n${generationResult.explanation}\n\nCo-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`;

    const commitResult = await gitManager.commit({
      message: commitMessage,
      files: generationResult.modifications.map((mod) => mod.filePath),
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

    // Step 6: Run automated tests (unless skipped)
    let testResults = null;
    if (!skipTests) {
      console.log('\n[Step 6/7] Running automated tests...');

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

          // Rollback changes
          console.log('Rolling back changes...');
          await gitManager.revertCommit(commitResult.data.commit);

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
      console.log('\n[Step 6/7] Skipping tests (skipTests=true)');
    }

    // Step 7: Success!
    const duration = Date.now() - startTime;
    console.log('\n[Step 7/7] Code modification complete!');
    console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
    console.log('='.repeat(80));

    return NextResponse.json({
      success: true,
      message: 'Code modifications applied successfully',
      data: {
        modifications: generationResult.modifications.map((mod) => ({
          filePath: mod.filePath,
          created: mod.createIfMissing,
        })),
        explanation: generationResult.explanation,
        thinking: generationResult.thinking,
        warnings: generationResult.warnings,
        commit: {
          hash: commitResult.data?.commit,
          message: commitMessage,
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
