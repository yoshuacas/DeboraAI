import { promises as fs } from 'fs';
import * as path from 'path';
import {
  isProtectedFile,
  isSensitiveFile,
  ProtectedFileError,
  SensitiveFileWarning,
} from './protected-files';

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  filePath: string;
  operation: 'read' | 'write' | 'delete' | 'move' | 'create';
  message?: string;
  error?: string;
  backupPath?: string;
}

/**
 * File modification request
 */
export interface FileModification {
  filePath: string;
  content: string;
  createIfMissing?: boolean;
}

/**
 * FileManager Service
 *
 * CRITICAL SERVICE for safe file operations.
 * All file modifications by the AI agent must go through this service.
 *
 * Features:
 * - Protected file validation
 * - Atomic operations
 * - Automatic backups
 * - Operation logging
 * - Rollback support
 *
 * Usage:
 * ```typescript
 * const fileManager = new FileManager('/path/to/project');
 * const result = await fileManager.writeFile('src/app/page.tsx', newContent);
 * if (!result.success) {
 *   console.error(result.error);
 * }
 * ```
 */
export class FileManager {
  private projectRoot: string;
  private backupDir: string;
  private operationLog: FileOperationResult[] = [];

  constructor(projectRoot: string, backupDir?: string) {
    this.projectRoot = projectRoot;
    this.backupDir = backupDir || path.join(projectRoot, '.backups');
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<FileOperationResult> {
    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Check if file exists
      await fs.access(absolutePath);

      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');

      const result: FileOperationResult = {
        success: true,
        filePath,
        operation: 'read',
        message: `Successfully read file: ${filePath}`,
      };

      this.logOperation(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        filePath,
        operation: 'read',
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
      };

      this.logOperation(result);
      return result;
    }
  }

  /**
   * Write file contents (with protection checks)
   */
  async writeFile(
    filePath: string,
    content: string,
    options: { createIfMissing?: boolean; skipProtectionCheck?: boolean } = {}
  ): Promise<FileOperationResult> {
    // Protection check
    if (!options.skipProtectionCheck) {
      if (isProtectedFile(filePath)) {
        throw new ProtectedFileError(filePath);
      }

      if (isSensitiveFile(filePath)) {
        console.warn(new SensitiveFileWarning(filePath).message);
      }
    }

    const absolutePath = this.getAbsolutePath(filePath);
    let backupPath: string | undefined;

    try {
      // Check if file exists
      const fileExists = await this.fileExists(absolutePath);

      if (!fileExists && !options.createIfMissing) {
        return {
          success: false,
          filePath,
          operation: 'write',
          error: 'File does not exist and createIfMissing is false',
        };
      }

      // Create backup if file exists
      if (fileExists) {
        backupPath = await this.createBackup(absolutePath);
      }

      // Ensure directory exists
      await this.ensureDirectory(path.dirname(absolutePath));

      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');

      const result: FileOperationResult = {
        success: true,
        filePath,
        operation: 'write',
        message: `Successfully wrote file: ${filePath}`,
        backupPath,
      };

      this.logOperation(result);
      return result;
    } catch (error) {
      // Restore backup if write failed
      if (backupPath) {
        try {
          await fs.copyFile(backupPath, absolutePath);
          console.log(`Restored backup from ${backupPath}`);
        } catch (restoreError) {
          console.error('Failed to restore backup:', restoreError);
        }
      }

      const result: FileOperationResult = {
        success: false,
        filePath,
        operation: 'write',
        error: `Failed to write file: ${error instanceof Error ? error.message : String(error)}`,
      };

      this.logOperation(result);
      return result;
    }
  }

  /**
   * Delete file (with protection checks)
   */
  async deleteFile(filePath: string): Promise<FileOperationResult> {
    // Protection check
    if (isProtectedFile(filePath)) {
      throw new ProtectedFileError(filePath);
    }

    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Create backup before deleting
      const backupPath = await this.createBackup(absolutePath);

      // Delete file
      await fs.unlink(absolutePath);

      const result: FileOperationResult = {
        success: true,
        filePath,
        operation: 'delete',
        message: `Successfully deleted file: ${filePath}`,
        backupPath,
      };

      this.logOperation(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        filePath,
        operation: 'delete',
        error: `Failed to delete file: ${error instanceof Error ? error.message : String(error)}`,
      };

      this.logOperation(result);
      return result;
    }
  }

  /**
   * Create new file (with protection checks)
   */
  async createFile(filePath: string, content: string = ''): Promise<FileOperationResult> {
    // Protection check
    if (isProtectedFile(filePath)) {
      throw new ProtectedFileError(filePath);
    }

    const absolutePath = this.getAbsolutePath(filePath);

    try {
      // Check if file already exists
      const exists = await this.fileExists(absolutePath);
      if (exists) {
        return {
          success: false,
          filePath,
          operation: 'create',
          error: 'File already exists. Use writeFile to update existing files.',
        };
      }

      // Ensure directory exists
      await this.ensureDirectory(path.dirname(absolutePath));

      // Create file
      await fs.writeFile(absolutePath, content, 'utf-8');

      const result: FileOperationResult = {
        success: true,
        filePath,
        operation: 'create',
        message: `Successfully created file: ${filePath}`,
      };

      this.logOperation(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        filePath,
        operation: 'create',
        error: `Failed to create file: ${error instanceof Error ? error.message : String(error)}`,
      };

      this.logOperation(result);
      return result;
    }
  }

  /**
   * Move/rename file (with protection checks)
   */
  async moveFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
    // Protection checks
    if (isProtectedFile(oldPath) || isProtectedFile(newPath)) {
      throw new ProtectedFileError(oldPath);
    }

    const absoluteOldPath = this.getAbsolutePath(oldPath);
    const absoluteNewPath = this.getAbsolutePath(newPath);

    try {
      // Create backup
      const backupPath = await this.createBackup(absoluteOldPath);

      // Ensure destination directory exists
      await this.ensureDirectory(path.dirname(absoluteNewPath));

      // Move file
      await fs.rename(absoluteOldPath, absoluteNewPath);

      const result: FileOperationResult = {
        success: true,
        filePath: oldPath,
        operation: 'move',
        message: `Successfully moved file from ${oldPath} to ${newPath}`,
        backupPath,
      };

      this.logOperation(result);
      return result;
    } catch (error) {
      const result: FileOperationResult = {
        success: false,
        filePath: oldPath,
        operation: 'move',
        error: `Failed to move file: ${error instanceof Error ? error.message : String(error)}`,
      };

      this.logOperation(result);
      return result;
    }
  }

  /**
   * Apply multiple file modifications atomically
   */
  async applyModifications(
    modifications: FileModification[]
  ): Promise<{
    success: boolean;
    results: FileOperationResult[];
    error?: string;
  }> {
    const results: FileOperationResult[] = [];
    const backups: string[] = [];

    try {
      // Validate all files first
      for (const mod of modifications) {
        if (isProtectedFile(mod.filePath)) {
          throw new ProtectedFileError(mod.filePath);
        }
      }

      // Apply all modifications
      for (const mod of modifications) {
        const result = await this.writeFile(mod.filePath, mod.content, {
          createIfMissing: mod.createIfMissing,
          skipProtectionCheck: true, // Already checked above
        });

        results.push(result);

        if (!result.success) {
          throw new Error(`Failed to modify ${mod.filePath}: ${result.error}`);
        }

        if (result.backupPath) {
          backups.push(result.backupPath);
        }
      }

      return { success: true, results };
    } catch (error) {
      // Rollback all changes
      console.error('Modification failed, rolling back...');

      for (let i = results.length - 1; i >= 0; i--) {
        const result = results[i];
        if (result.success && result.backupPath) {
          try {
            const absolutePath = this.getAbsolutePath(result.filePath);
            await fs.copyFile(result.backupPath, absolutePath);
          } catch (rollbackError) {
            console.error(`Failed to rollback ${result.filePath}:`, rollbackError);
          }
        }
      }

      return {
        success: false,
        results,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get operation log
   */
  getOperationLog(): FileOperationResult[] {
    return [...this.operationLog];
  }

  /**
   * Clear operation log
   */
  clearOperationLog(): void {
    this.operationLog = [];
  }

  // ========== Private Helper Methods ==========

  private getAbsolutePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.projectRoot, filePath);
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore error if directory already exists
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
        throw error;
      }
    }
  }

  private async createBackup(filePath: string): Promise<string> {
    const timestamp = Date.now();
    const relativePath = path.relative(this.projectRoot, filePath);
    const backupPath = path.join(
      this.backupDir,
      `${relativePath.replace(/\//g, '_')}_${timestamp}`
    );

    await this.ensureDirectory(path.dirname(backupPath));
    await fs.copyFile(filePath, backupPath);

    return backupPath;
  }

  private logOperation(result: FileOperationResult): void {
    this.operationLog.push(result);

    // Keep only last 1000 operations
    if (this.operationLog.length > 1000) {
      this.operationLog = this.operationLog.slice(-1000);
    }
  }
}

/**
 * Convenience function to create a FileManager instance
 */
export function createFileManager(projectRoot?: string): FileManager {
  const root = projectRoot || process.cwd();
  return new FileManager(root);
}
