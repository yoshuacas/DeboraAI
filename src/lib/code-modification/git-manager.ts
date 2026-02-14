import simpleGit, { SimpleGit, StatusResult, BranchSummary } from 'simple-git';

/**
 * Git operation result
 */
export interface GitOperationResult {
  success: boolean;
  operation: 'commit' | 'merge' | 'rollback' | 'status' | 'branch' | 'checkout';
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Commit options
 */
export interface CommitOptions {
  message: string;
  files?: string[]; // Specific files to commit, or all staged if undefined
  author?: {
    name: string;
    email: string;
  };
}

/**
 * GitManager Service
 *
 * CRITICAL SERVICE for version control operations.
 * Manages all git operations for the self-modifying system.
 *
 * Features:
 * - Commit code changes
 * - Merge branches (staging → production)
 * - Rollback bad changes
 * - Check repository status
 * - Branch management
 *
 * Usage:
 * ```typescript
 * const gitManager = new GitManager('/path/to/repo');
 * const result = await gitManager.commit({
 *   message: 'Add new feature',
 *   files: ['src/app/page.tsx']
 * });
 * ```
 */
export class GitManager {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get current git status
   */
  async getStatus(): Promise<GitOperationResult> {
    try {
      const status: StatusResult = await this.git.status();

      return {
        success: true,
        operation: 'status',
        message: 'Successfully retrieved git status',
        data: {
          branch: status.current,
          modified: status.modified,
          created: status.created,
          deleted: status.deleted,
          renamed: status.renamed,
          staged: status.staged,
          isClean: status.isClean(),
          ahead: status.ahead,
          behind: status.behind,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'status',
        error: `Failed to get git status: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Stage files for commit
   */
  async stageFiles(files: string[]): Promise<GitOperationResult> {
    try {
      if (files.length === 0) {
        return {
          success: false,
          operation: 'commit',
          error: 'No files specified to stage',
        };
      }

      await this.git.add(files);

      return {
        success: true,
        operation: 'commit',
        message: `Successfully staged ${files.length} file(s)`,
        data: { files },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'commit',
        error: `Failed to stage files: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Commit changes
   */
  async commit(options: CommitOptions): Promise<GitOperationResult> {
    try {
      // Stage files if specified
      if (options.files && options.files.length > 0) {
        await this.git.add(options.files);
      }

      // Set author if specified
      if (options.author) {
        await this.git.addConfig('user.name', options.author.name, false, 'local');
        await this.git.addConfig('user.email', options.author.email, false, 'local');
      }

      // Commit
      const commitResult = await this.git.commit(options.message);

      return {
        success: true,
        operation: 'commit',
        message: `Successfully created commit: ${commitResult.commit}`,
        data: {
          commit: commitResult.commit,
          summary: commitResult.summary,
          branch: commitResult.branch,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'commit',
        error: `Failed to commit: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.git.status();
    return status.current || 'unknown';
  }

  /**
   * List all branches
   */
  async listBranches(): Promise<GitOperationResult> {
    try {
      const branches: BranchSummary = await this.git.branch();

      return {
        success: true,
        operation: 'branch',
        message: 'Successfully listed branches',
        data: {
          current: branches.current,
          all: branches.all,
          branches: branches.branches,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'branch',
        error: `Failed to list branches: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string, checkout: boolean = false): Promise<GitOperationResult> {
    try {
      if (checkout) {
        await this.git.checkoutLocalBranch(branchName);
      } else {
        await this.git.branch([branchName]);
      }

      return {
        success: true,
        operation: 'branch',
        message: `Successfully created branch: ${branchName}`,
        data: { branchName, checkedOut: checkout },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'branch',
        error: `Failed to create branch: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Checkout a branch
   */
  async checkoutBranch(branchName: string): Promise<GitOperationResult> {
    try {
      await this.git.checkout(branchName);

      return {
        success: true,
        operation: 'checkout',
        message: `Successfully checked out branch: ${branchName}`,
        data: { branchName },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'checkout',
        error: `Failed to checkout branch: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Merge a branch into current branch
   */
  async mergeBranch(
    sourceBranch: string,
    options?: { noFastForward?: boolean }
  ): Promise<GitOperationResult> {
    try {
      const currentBranch = await this.getCurrentBranch();

      const mergeOptions: string[] = [];
      if (options?.noFastForward) {
        mergeOptions.push('--no-ff');
      }

      await this.git.merge([sourceBranch, ...mergeOptions]);

      return {
        success: true,
        operation: 'merge',
        message: `Successfully merged ${sourceBranch} into ${currentBranch}`,
        data: {
          sourceBranch,
          targetBranch: currentBranch,
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'merge',
        error: `Failed to merge branches: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Rollback to a specific commit
   */
  async rollbackToCommit(commitHash: string, hard: boolean = false): Promise<GitOperationResult> {
    try {
      if (hard) {
        await this.git.reset(['--hard', commitHash]);
      } else {
        await this.git.reset(['--soft', commitHash]);
      }

      return {
        success: true,
        operation: 'rollback',
        message: `Successfully rolled back to commit: ${commitHash}`,
        data: { commitHash, hard },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'rollback',
        error: `Failed to rollback: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Revert a specific commit (create new commit that undoes changes)
   */
  async revertCommit(commitHash: string): Promise<GitOperationResult> {
    try {
      await this.git.revert(commitHash);

      return {
        success: true,
        operation: 'rollback',
        message: `Successfully reverted commit: ${commitHash}`,
        data: { commitHash },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'rollback',
        error: `Failed to revert commit: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get commit history
   */
  async getLog(maxCount: number = 10): Promise<GitOperationResult> {
    try {
      const log = await this.git.log({ maxCount });

      return {
        success: true,
        operation: 'status',
        message: 'Successfully retrieved commit history',
        data: {
          total: log.total,
          latest: log.latest,
          commits: log.all.map((commit) => ({
            hash: commit.hash,
            date: commit.date,
            message: commit.message,
            author: commit.author_name,
            email: commit.author_email,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'status',
        error: `Failed to get commit log: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get diff between commits or branches
   */
  async getDiff(from?: string, to?: string): Promise<GitOperationResult> {
    try {
      let diff: string;

      if (from && to) {
        diff = await this.git.diff([from, to]);
      } else if (from) {
        diff = await this.git.diff([from]);
      } else {
        diff = await this.git.diff();
      }

      return {
        success: true,
        operation: 'status',
        message: 'Successfully retrieved diff',
        data: { diff },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'status',
        error: `Failed to get diff: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check if repository is clean (no uncommitted changes)
   */
  async isClean(): Promise<boolean> {
    const status = await this.git.status();
    return status.isClean();
  }

  /**
   * Discard all uncommitted changes (DANGEROUS!)
   */
  async discardChanges(): Promise<GitOperationResult> {
    try {
      await this.git.reset(['--hard']);
      await this.git.clean('f', ['-d']);

      return {
        success: true,
        operation: 'rollback',
        message: 'Successfully discarded all uncommitted changes',
      };
    } catch (error) {
      return {
        success: false,
        operation: 'rollback',
        error: `Failed to discard changes: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Push commits to remote repository
   */
  async push(options: { remote?: string; branch?: string } = {}): Promise<GitOperationResult> {
    const remote = options.remote || 'origin';
    const branch = options.branch || 'staging';

    try {
      await this.git.push(remote, branch);

      return {
        success: true,
        operation: 'push',
        message: `Successfully pushed to ${remote}/${branch}`,
      };
    } catch (error) {
      return {
        success: false,
        operation: 'push',
        error: `Failed to push: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Convenience function to create a GitManager instance
 */
export function createGitManager(repoPath?: string): GitManager {
  const path = repoPath || process.cwd();
  return new GitManager(path);
}
