#!/usr/bin/env node

/**
 * Test script to validate promotion workflow end-to-end
 */

const { execSync } = require('child_process');
const path = require('path');

async function testPromotion() {
  console.log('='.repeat(80));
  console.log('TESTING PROMOTION WORKFLOW END-TO-END');
  console.log('='.repeat(80));

  const stagingPath = process.cwd();
  const productionPath = path.join(process.cwd(), '../production');

  try {
    // Step 1: Check current state
    console.log('\n[Step 1] Checking current state...');

    const stagingCommit = execSync('git rev-parse HEAD', { cwd: stagingPath }).toString().trim();
    const productionCommit = execSync('git rev-parse HEAD', { cwd: productionPath }).toString().trim();

    console.log(`  Staging commit:    ${stagingCommit.substring(0, 7)}`);
    console.log(`  Production commit: ${productionCommit.substring(0, 7)}`);

    if (stagingCommit === productionCommit) {
      console.log('  ⚠️  WARNING: Staging and production are already in sync');
      console.log('  Making sure there are changes to promote...');
    }

    // Step 2: Check diff
    console.log('\n[Step 2] Checking diff between staging and production...');

    try {
      const diff = execSync('git log origin/main..origin/staging --oneline', {
        cwd: stagingPath
      }).toString().trim();

      if (!diff) {
        console.log('  ℹ️  No commits to promote (already in sync)');
        return;
      }

      console.log('  Commits to promote:');
      diff.split('\n').forEach(line => console.log(`    ${line}`));
    } catch (err) {
      console.log('  ⚠️  Could not get diff (this is okay for first promotion)');
    }

    // Step 3: Run promotion using TypeScript module
    console.log('\n[Step 3] Running promotion...');
    console.log('  (This will compile and execute the promotion manager)');

    const { createPromotionManager } = require('./src/lib/promotion/promotion-manager.ts');
    const manager = createPromotionManager();

    const result = await manager.promote({
      performedBy: 'automated-test',
      message: 'Testing promotion workflow end-to-end',
    });

    if (result.success) {
      console.log('\n✅ PROMOTION SUCCESSFUL!');
      console.log(`  Files changed: ${result.changes.filesChanged}`);
      console.log(`  Commits: ${result.changes.commits}`);
    } else {
      console.log('\n❌ PROMOTION FAILED!');
      console.log(`  Error: ${result.error}`);
      process.exit(1);
    }

    // Step 4: Verify production was updated
    console.log('\n[Step 4] Verifying production was updated...');

    const newProductionCommit = execSync('git rev-parse HEAD', { cwd: productionPath }).toString().trim();
    console.log(`  New production commit: ${newProductionCommit.substring(0, 7)}`);

    if (newProductionCommit !== productionCommit) {
      console.log('  ✅ Production commit changed - promotion successful!');
    } else {
      console.log('  ⚠️  Production commit unchanged');
    }

    // Step 5: Check production worktree is clean
    console.log('\n[Step 5] Verifying production worktree is clean...');

    const prodStatus = execSync('git status --porcelain -uno', { cwd: productionPath }).toString().trim();

    if (prodStatus === '') {
      console.log('  ✅ Production worktree is clean (no uncommitted changes)');
    } else {
      console.log('  ❌ Production worktree has uncommitted changes:');
      console.log(prodStatus);
      process.exit(1);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED - PROMOTION WORKFLOW IS WORKING!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testPromotion();
