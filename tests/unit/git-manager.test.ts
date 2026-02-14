/**
 * Tests for GitManager service
 */

import { GitManager, createGitManager } from '@/lib/code-modification/git-manager';

describe('GitManager', () => {
  let gitManager: GitManager;

  beforeEach(() => {
    // Use current working directory (which is a git repo)
    gitManager = new GitManager(process.cwd());
  });

  describe('constructor', () => {
    it('should create GitManager instance', () => {
      expect(gitManager).toBeInstanceOf(GitManager);
    });
  });

  describe('getStatus', () => {
    it('should get git status', async () => {
      const result = await gitManager.getStatus();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
      expect(result.data).toBeDefined();
      expect(result.data.branch).toBeDefined();
    });

    it('should return branch name', async () => {
      const result = await gitManager.getStatus();

      expect(typeof result.data.branch).toBe('string');
      expect(result.data.branch).toBeTruthy();
    });

    it('should return file status', async () => {
      const result = await gitManager.getStatus();

      expect(result.data).toHaveProperty('modified');
      expect(result.data).toHaveProperty('created');
      expect(result.data).toHaveProperty('deleted');
      expect(result.data).toHaveProperty('staged');
    });
  });

  describe('getCurrentBranch', () => {
    it('should return current branch name', async () => {
      const branch = await gitManager.getCurrentBranch();

      expect(typeof branch).toBe('string');
      expect(branch).toBeTruthy();
      expect(branch).not.toBe('unknown');
    });
  });

  describe('listBranches', () => {
    it('should list all branches', async () => {
      const result = await gitManager.listBranches();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('branch');
      expect(result.data).toBeDefined();
      expect(result.data.current).toBeDefined();
      expect(Array.isArray(result.data.all)).toBe(true);
    });
  });

  describe('getLog', () => {
    it('should get commit history', async () => {
      const result = await gitManager.getLog(5);

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
      expect(result.data).toBeDefined();
      expect(result.data.commits).toBeDefined();
      expect(Array.isArray(result.data.commits)).toBe(true);
    });

    it('should limit number of commits', async () => {
      const result = await gitManager.getLog(3);

      expect(result.data.commits.length).toBeLessThanOrEqual(3);
    });

    it('should include commit details', async () => {
      const result = await gitManager.getLog(1);

      if (result.data.commits.length > 0) {
        const commit = result.data.commits[0];
        expect(commit).toHaveProperty('hash');
        expect(commit).toHaveProperty('date');
        expect(commit).toHaveProperty('message');
        expect(commit).toHaveProperty('author');
      }
    });
  });

  describe('isClean', () => {
    it('should check if repo is clean', async () => {
      const isClean = await gitManager.isClean();

      expect(typeof isClean).toBe('boolean');
    });
  });

  describe('getDiff', () => {
    it('should get diff', async () => {
      const result = await gitManager.getDiff();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('diff');
    });
  });

  describe('createGitManager', () => {
    it('should create a GitManager instance', () => {
      const gm = createGitManager();
      expect(gm).toBeInstanceOf(GitManager);
    });

    it('should accept custom repo path', () => {
      // Use process.cwd() which is a valid repo path
      const gm = createGitManager(process.cwd());
      expect(gm).toBeInstanceOf(GitManager);
    });
  });

  // The following tests are skipped because they modify the git repository
  // These should be tested in integration tests with a test repository

  describe.skip('commit (integration)', () => {
    it('should commit changes', async () => {
      const result = await gitManager.commit({
        message: 'Test commit',
        files: ['test-file.txt'],
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('commit');
      expect(result.data.commit).toBeDefined();
    });
  });

  describe.skip('stageFiles (integration)', () => {
    it('should stage files', async () => {
      const result = await gitManager.stageFiles(['test-file.txt']);

      expect(result.success).toBe(true);
      expect(result.data.files).toContain('test-file.txt');
    });
  });

  describe.skip('createBranch (integration)', () => {
    it('should create a new branch', async () => {
      const result = await gitManager.createBranch('test-branch');

      expect(result.success).toBe(true);
      expect(result.data.branchName).toBe('test-branch');
    });
  });

  describe.skip('checkoutBranch (integration)', () => {
    it('should checkout a branch', async () => {
      const result = await gitManager.checkoutBranch('main');

      expect(result.success).toBe(true);
      expect(result.data.branchName).toBe('main');
    });
  });

  describe.skip('mergeBranch (integration)', () => {
    it('should merge branches', async () => {
      const result = await gitManager.mergeBranch('feature-branch');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('merge');
    });
  });

  describe.skip('rollbackToCommit (integration)', () => {
    it('should rollback to a commit', async () => {
      const result = await gitManager.rollbackToCommit('HEAD~1');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
    });
  });

  describe.skip('revertCommit (integration)', () => {
    it('should revert a commit', async () => {
      const result = await gitManager.revertCommit('abc123');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
    });
  });

  describe.skip('discardChanges (integration)', () => {
    it('should discard all changes', async () => {
      const result = await gitManager.discardChanges();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
    });
  });
});
