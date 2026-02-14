/**
 * Tests for FileManager service
 */

import { FileManager, createFileManager } from '@/lib/code-modification/file-manager';
import { ProtectedFileError } from '@/lib/code-modification/protected-files';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('FileManager', () => {
  let testDir: string;
  let fileManager: FileManager;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'filemanager-test-'));
    fileManager = new FileManager(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('createFile', () => {
    it('should create a new file', async () => {
      const result = await fileManager.createFile('test.txt', 'Hello World');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('create');
      expect(result.filePath).toBe('test.txt');

      // Verify file exists
      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Hello World');
    });

    it('should create nested directories automatically', async () => {
      const result = await fileManager.createFile('dir1/dir2/test.txt', 'Content');

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(testDir, 'dir1/dir2/test.txt'), 'utf-8');
      expect(content).toBe('Content');
    });

    it('should fail if file already exists', async () => {
      await fileManager.createFile('test.txt', 'First');
      const result = await fileManager.createFile('test.txt', 'Second');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should throw error for protected files', async () => {
      await expect(fileManager.createFile('src/lib/auth.ts', 'code')).rejects.toThrow(
        ProtectedFileError
      );
    });
  });

  describe('writeFile', () => {
    it('should write to existing file', async () => {
      // Create file first
      await fileManager.createFile('test.txt', 'Original');

      // Update it
      const result = await fileManager.writeFile('test.txt', 'Updated');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('write');
      expect(result.backupPath).toBeDefined();

      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8');
      expect(content).toBe('Updated');
    });

    it('should create file if createIfMissing is true', async () => {
      const result = await fileManager.writeFile('new.txt', 'Content', {
        createIfMissing: true,
      });

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8');
      expect(content).toBe('Content');
    });

    it('should fail if file does not exist and createIfMissing is false', async () => {
      const result = await fileManager.writeFile('missing.txt', 'Content', {
        createIfMissing: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('does not exist');
    });

    it('should throw error for protected files', async () => {
      await expect(fileManager.writeFile('.env', 'SECRET=123')).rejects.toThrow(
        ProtectedFileError
      );
    });
  });

  describe('readFile', () => {
    it('should read file contents', async () => {
      await fileManager.createFile('test.txt', 'Hello');

      const result = await fileManager.readFile('test.txt');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('read');
    });

    it('should fail if file does not exist', async () => {
      const result = await fileManager.readFile('missing.txt');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file', async () => {
      await fileManager.createFile('test.txt', 'Delete me');

      const result = await fileManager.deleteFile('test.txt');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('delete');
      expect(result.backupPath).toBeDefined();

      // Verify file is deleted
      await expect(fs.access(path.join(testDir, 'test.txt'))).rejects.toThrow();
    });

    it('should throw error for protected files', async () => {
      await expect(fileManager.deleteFile('package.json')).rejects.toThrow(ProtectedFileError);
    });
  });

  describe('moveFile', () => {
    it('should move a file', async () => {
      await fileManager.createFile('old.txt', 'Content');

      const result = await fileManager.moveFile('old.txt', 'new.txt');

      expect(result.success).toBe(true);
      expect(result.operation).toBe('move');

      // Verify old file is gone
      await expect(fs.access(path.join(testDir, 'old.txt'))).rejects.toThrow();

      // Verify new file exists
      const content = await fs.readFile(path.join(testDir, 'new.txt'), 'utf-8');
      expect(content).toBe('Content');
    });

    it('should throw error if moving to/from protected files', async () => {
      await expect(fileManager.moveFile('src/lib/auth.ts', 'backup.ts')).rejects.toThrow(
        ProtectedFileError
      );
    });
  });

  describe('applyModifications', () => {
    it('should apply multiple modifications atomically', async () => {
      const modifications = [
        { filePath: 'file1.txt', content: 'Content 1', createIfMissing: true },
        { filePath: 'file2.txt', content: 'Content 2', createIfMissing: true },
        { filePath: 'file3.txt', content: 'Content 3', createIfMissing: true },
      ];

      const result = await fileManager.applyModifications(modifications);

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results.every((r) => r.success)).toBe(true);

      // Verify all files exist
      for (const mod of modifications) {
        const content = await fs.readFile(path.join(testDir, mod.filePath), 'utf-8');
        expect(content).toBe(mod.content);
      }
    });

    it('should rollback all changes if one fails', async () => {
      // Create an existing file
      await fileManager.createFile('file1.txt', 'Original');

      const modifications = [
        { filePath: 'file1.txt', content: 'Updated', createIfMissing: false },
        { filePath: 'src/lib/auth.ts', content: 'BAD', createIfMissing: true }, // Protected!
      ];

      const result = await fileManager.applyModifications(modifications);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Verify file1.txt was rolled back to original
      const content = await fs.readFile(path.join(testDir, 'file1.txt'), 'utf-8');
      expect(content).toBe('Original');
    });
  });

  describe('operation logging', () => {
    it('should log all operations', async () => {
      await fileManager.createFile('test.txt', 'Content');
      await fileManager.writeFile('test.txt', 'Updated', { createIfMissing: false });
      await fileManager.readFile('test.txt');

      const log = fileManager.getOperationLog();

      expect(log).toHaveLength(3);
      expect(log[0].operation).toBe('create');
      expect(log[1].operation).toBe('write');
      expect(log[2].operation).toBe('read');
    });

    it('should clear operation log', async () => {
      await fileManager.createFile('test.txt', 'Content');

      fileManager.clearOperationLog();

      const log = fileManager.getOperationLog();
      expect(log).toHaveLength(0);
    });
  });

  describe('createFileManager', () => {
    it('should create a FileManager instance', () => {
      const fm = createFileManager(testDir);
      expect(fm).toBeInstanceOf(FileManager);
    });
  });
});
