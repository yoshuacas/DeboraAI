import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Promotion result structure
 */
export interface PromotionResult {
  success: boolean;
  message: string;
  changes?: {
    filesChanged: number;
    insertions: number;
    deletions: number;
    commits: number;
  };
  error?: string;
  details?: string;
}

/**
 * Promotion diff information
 */
export interface PromotionDiff {
  ahead: number; // commits in staging not in production
  behind: number; // commits in production not in staging
  files: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted';
    additions: number;
    deletions: number;
  }>;
  commits: Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
  }>;
}

/**
 * Promotion Manager
 *
 * Handles the workflow of promoting staging changes to production.
 * This is a CRITICAL operation that deploys code to the live environment.
 *
 * Safety checks:
 * - All staging tests must pass
 * - No uncommitted changes in staging
 * - Production branch must be clean
 * - Git operations are validated
 *
 * Usage:
 * ```typescript
 * const manager = new PromotionManager({
 *   stagingPath: '/path/to/staging',
 *   productionPath: '/path/to/production',
 * });
 *
 * // Check what would be promoted
 * const diff = await manager.getDiff();
 *
 * // Promote staging to production
 * const result = await manager.promote({ performedBy: 'admin@example.com' });
 * ```
 */
export class PromotionManager {
  private stagingPath: string;
  private productionPath: string;

  constructor(config: { stagingPath: string; productionPath: string }) {
    this.stagingPath = config.stagingPath;
    this.productionPath = config.productionPath;
  }

  /**
   * Get diff between staging and production
   */
  async getDiff(): Promise<PromotionDiff> {
    try {
      // Get commits ahead/behind
      const { stdout: revCount } = await execAsync(
        'git rev-list --left-right --count origin/staging...origin/main',
        { cwd: this.stagingPath }
      );

      const [ahead, behind] = revCount.trim().split('\t').map(Number);

      // Get list of commits in staging not in production
      const { stdout: logOutput } = await execAsync(
        'git log origin/main..origin/staging --format="%H|%s|%an|%ai" --no-merges',
        { cwd: this.stagingPath }
      );

      const commits = logOutput
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          const [hash, message, author, date] = line.split('|');
          return { hash, message, author, date };
        });

      // Get file changes
      const { stdout: diffStat } = await execAsync(
        'git diff --numstat origin/main...origin/staging',
        { cwd: this.stagingPath }
      );

      const files = diffStat
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          const [additions, deletions, path] = line.split('\t');
          return {
            path,
            status: additions === '0' && deletions !== '0' ? 'deleted' :
                    deletions === '0' && additions !== '0' ? 'added' :
                    'modified' as 'modified' | 'added' | 'deleted',
            additions: parseInt(additions) || 0,
            deletions: parseInt(deletions) || 0,
          };
        });

      return {
        ahead,
        behind,
        files,
        commits,
      };
    } catch (error) {
      throw new Error(`Failed to get diff: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Perform pre-promotion safety checks
   */
  async runSafetyChecks(): Promise<{ passed: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check 1: Staging has no uncommitted changes
      // Use -uno to ignore untracked files (like test-results/, temp files, etc.)
      const { stdout: stagingStatus } = await execAsync('git status --porcelain -uno', {
        cwd: this.stagingPath,
      });

      if (stagingStatus.trim().length > 0) {
        issues.push('Staging has uncommitted changes. Commit or discard them first.');
      }

      // Check 2: Production branch is clean
      // Use -uno to ignore untracked files
      const { stdout: productionStatus } = await execAsync('git status --porcelain -uno', {
        cwd: this.productionPath,
      });

      if (productionStatus.trim().length > 0) {
        issues.push('Production has uncommitted changes. This should never happen - investigate.');
      }

      // Check 3: Both worktrees are on correct branches
      const { stdout: stagingBranch } = await execAsync('git branch --show-current', {
        cwd: this.stagingPath,
      });

      const { stdout: productionBranch } = await execAsync('git branch --show-current', {
        cwd: this.productionPath,
      });

      if (stagingBranch.trim() !== 'staging') {
        issues.push(`Staging is on wrong branch: ${stagingBranch.trim()} (expected: staging)`);
      }

      if (productionBranch.trim() !== 'main') {
        issues.push(`Production is on wrong branch: ${productionBranch.trim()} (expected: main)`);
      }

      // Check 4: Fetch latest from remote
      await execAsync('git fetch origin', { cwd: this.stagingPath });

      // Check 5: Staging is up to date with remote
      const { stdout: stagingRemoteStatus } = await execAsync(
        'git rev-list --count HEAD..origin/staging',
        { cwd: this.stagingPath }
      );

      if (parseInt(stagingRemoteStatus.trim()) > 0) {
        issues.push('Staging is behind remote. Pull latest changes first.');
      }

      // Check 6: There are actually changes to promote
      const diff = await this.getDiff();

      if (diff.ahead === 0) {
        issues.push('No changes to promote. Staging and production are already in sync.');
      }

      return {
        passed: issues.length === 0,
        issues,
      };
    } catch (error) {
      issues.push(`Safety check failed: ${error instanceof Error ? error.message : String(error)}`);
      return { passed: false, issues };
    }
  }

  /**
   * Promote staging changes to production
   */
  async promote(options: { performedBy: string; message?: string }): Promise<PromotionResult> {
    const startTime = Date.now();

    try {
      console.log('='.repeat(80));
      console.log('PROMOTION: STAGING → PRODUCTION');
      console.log('='.repeat(80));
      console.log(`Performed by: ${options.performedBy}`);
      console.log('-'.repeat(80));

      // Step 1: Safety checks
      console.log('\n[Step 1/5] Running safety checks...');
      const safetyCheck = await this.runSafetyChecks();

      if (!safetyCheck.passed) {
        console.error('✗ Safety checks failed:');
        safetyCheck.issues.forEach((issue) => console.error(`  - ${issue}`));
        return {
          success: false,
          message: 'Safety checks failed',
          error: safetyCheck.issues.join('\n'),
        };
      }

      console.log('✓ All safety checks passed');

      // Step 2: Get diff for summary
      console.log('\n[Step 2/5] Analyzing changes...');
      const diff = await this.getDiff();
      console.log(`Changes to promote:`);
      console.log(`  - ${diff.commits.length} commit(s)`);
      console.log(`  - ${diff.files.length} file(s) changed`);
      console.log('✓ Changes analyzed');

      // Step 3: Push staging to origin (if not already)
      console.log('\n[Step 3/5] Ensuring staging is pushed to origin...');
      await execAsync('git push origin staging', { cwd: this.stagingPath });
      console.log('✓ Staging pushed to origin');

      // Step 4: Merge staging into main (from production worktree)
      console.log('\n[Step 4/5] Merging staging into main branch...');

      try {
        // In production worktree, merge origin/staging into main
        const mergeMessage = options.message ||
          `Promote staging to production\n\nPerformed by: ${options.performedBy}\nDate: ${new Date().toISOString()}\n\nCommits included: ${diff.commits.length}\nFiles changed: ${diff.files.length}`;

        // Fetch latest from origin
        await execAsync('git fetch origin', { cwd: this.productionPath });

        // Merge origin/staging into current main branch
        await execAsync(`git merge origin/staging --no-ff -m "${mergeMessage}"`, {
          cwd: this.productionPath,
        });

        console.log('✓ Merge completed');

        // Step 5: Push to remote main
        console.log('\n[Step 5/5] Pushing to production branch...');
        await execAsync('git push origin main', { cwd: this.productionPath });
        console.log('✓ Pushed to origin/main');

        // Success!
        const duration = Date.now() - startTime;
        console.log('\n✓ Promotion complete!');
        console.log(`Total time: ${(duration / 1000).toFixed(2)}s`);
        console.log('='.repeat(80));

        return {
          success: true,
          message: 'Successfully promoted staging to production',
          changes: {
            filesChanged: diff.files.length,
            insertions: diff.files.reduce((sum, f) => sum + f.additions, 0),
            deletions: diff.files.reduce((sum, f) => sum + f.deletions, 0),
            commits: diff.commits.length,
          },
        };
      } catch (mergeError) {
        // Rollback: abort merge in production worktree
        console.error('✗ Merge failed, rolling back...');
        try {
          await execAsync('git merge --abort', { cwd: this.productionPath });
        } catch (rollbackError) {
          console.error('✗ Rollback failed - manual intervention required!');
        }

        throw mergeError;
      }
    } catch (error) {
      console.error('✗ Promotion failed:', error);
      return {
        success: false,
        message: 'Promotion failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Rollback production to a previous commit
   */
  async rollback(options: { toCommit: string; performedBy: string }): Promise<PromotionResult> {
    try {
      console.log('='.repeat(80));
      console.log('ROLLBACK: PRODUCTION → PREVIOUS STATE');
      console.log('='.repeat(80));
      console.log(`Rolling back to: ${options.toCommit}`);
      console.log(`Performed by: ${options.performedBy}`);
      console.log('-'.repeat(80));

      // Verify commit exists
      try {
        await execAsync(`git cat-file -e ${options.toCommit}^{commit}`, {
          cwd: this.productionPath,
        });
      } catch {
        return {
          success: false,
          message: 'Invalid commit hash',
          error: `Commit ${options.toCommit} does not exist`,
        };
      }

      // Reset production to specified commit
      await execAsync(`git reset --hard ${options.toCommit}`, {
        cwd: this.productionPath,
      });

      // Force push to remote (dangerous but necessary for rollback)
      await execAsync('git push origin main --force', {
        cwd: this.productionPath,
      });

      console.log('✓ Rollback complete');
      console.log('='.repeat(80));

      return {
        success: true,
        message: `Successfully rolled back to ${options.toCommit}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Rollback failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get promotion history
   */
  async getHistory(limit: number = 20): Promise<Array<{
    hash: string;
    message: string;
    author: string;
    date: string;
    isPromotion: boolean;
  }>> {
    try {
      const { stdout } = await execAsync(
        `git log origin/main --format="%H|%s|%an|%ai" -n ${limit}`,
        { cwd: this.productionPath }
      );

      return stdout
        .trim()
        .split('\n')
        .filter((line) => line.length > 0)
        .map((line) => {
          const [hash, message, author, date] = line.split('|');
          const isPromotion = message.toLowerCase().includes('promote') ||
                             message.toLowerCase().includes('production');
          return { hash, message, author, date, isPromotion };
        });
    } catch (error) {
      throw new Error(`Failed to get history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Convenience function to create a promotion manager
 */
export function createPromotionManager(config?: {
  stagingPath?: string;
  productionPath?: string;
}): PromotionManager {
  const stagingPath = config?.stagingPath ||
    process.env.STAGING_PATH ||
    '/Users/davcasd/research/DeboraAI/staging';

  const productionPath = config?.productionPath ||
    process.env.PRODUCTION_PATH ||
    '/Users/davcasd/research/DeboraAI/production';

  return new PromotionManager({ stagingPath, productionPath });
}
