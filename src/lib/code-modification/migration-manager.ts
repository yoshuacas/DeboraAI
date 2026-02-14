import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

/**
 * Migration operation result
 */
export interface MigrationResult {
  success: boolean;
  operation: 'generate' | 'apply' | 'rollback' | 'status' | 'validate';
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  name?: string;
  skipGenerate?: boolean;
  createOnly?: boolean;
}

/**
 * MigrationManager Service
 *
 * Manages Prisma database migrations for schema changes.
 *
 * Features:
 * - Detect schema changes
 * - Generate migrations
 * - Apply migrations to databases
 * - Rollback migrations
 * - Validate schema
 *
 * Usage:
 * ```typescript
 * const migrationManager = new MigrationManager('/path/to/project');
 * const result = await migrationManager.generateMigration({
 *   name: 'add-user-field'
 * });
 * ```
 */
export class MigrationManager {
  private projectRoot: string;
  private prismaDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.prismaDir = path.join(projectRoot, 'prisma');
  }

  /**
   * Validate Prisma schema
   */
  async validateSchema(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma validate', {
        cwd: this.projectRoot,
        timeout: 15000,
      });

      return {
        success: true,
        operation: 'validate',
        message: 'Schema validation successful',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'validate',
        error: `Schema validation failed: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Generate a new migration
   */
  async generateMigration(options: MigrationOptions = {}): Promise<MigrationResult> {
    try {
      // First, validate schema
      const validation = await this.validateSchema();
      if (!validation.success) {
        return {
          success: false,
          operation: 'generate',
          error: `Cannot generate migration: ${validation.error}`,
        };
      }

      const migrationName = options.name || `migration_${Date.now()}`;

      // Generate migration
      const command = options.createOnly
        ? `npx prisma migrate dev --name ${migrationName} --create-only`
        : `npx prisma migrate dev --name ${migrationName}`;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        timeout: 30000,
      });

      return {
        success: true,
        operation: 'generate',
        message: `Successfully generated migration: ${migrationName}`,
        data: { name: migrationName, stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'generate',
        error: `Failed to generate migration: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Apply pending migrations to database
   */
  async applyMigrations(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      return {
        success: true,
        operation: 'apply',
        message: 'Successfully applied pending migrations',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'apply',
        error: `Failed to apply migrations: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Get migration status
   */
  async getStatus(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate status', {
        cwd: this.projectRoot,
        timeout: 15000,
      });

      return {
        success: true,
        operation: 'status',
        message: 'Successfully retrieved migration status',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      // Note: migrate status returns non-zero exit code if migrations are pending
      // We still want to return success with the status info
      return {
        success: true,
        operation: 'status',
        message: 'Migration status retrieved (some migrations may be pending)',
        data: {
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          hasPending: true,
        },
      };
    }
  }

  /**
   * Reset database (DANGEROUS - deletes all data)
   */
  async resetDatabase(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate reset --force', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      return {
        success: true,
        operation: 'rollback',
        message: 'Successfully reset database',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'rollback',
        error: `Failed to reset database: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Resolve failed migration state
   */
  async resolveMigration(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma migrate resolve --applied', {
        cwd: this.projectRoot,
        timeout: 15000,
      });

      return {
        success: true,
        operation: 'apply',
        message: 'Successfully resolved migration state',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'apply',
        error: `Failed to resolve migration: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Generate Prisma client
   */
  async generateClient(): Promise<MigrationResult> {
    try {
      const { stdout, stderr } = await execAsync('npx prisma generate', {
        cwd: this.projectRoot,
        timeout: 60000,
      });

      return {
        success: true,
        operation: 'generate',
        message: 'Successfully generated Prisma client',
        data: { stdout, stderr },
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'generate',
        error: `Failed to generate Prisma client: ${error.stdout || error.stderr || error.message}`,
      };
    }
  }

  /**
   * Check if schema file exists
   */
  async schemaExists(): Promise<boolean> {
    try {
      const schemaPath = path.join(this.prismaDir, 'schema.prisma');
      await fs.access(schemaPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read schema file
   */
  async readSchema(): Promise<string | null> {
    try {
      const schemaPath = path.join(this.prismaDir, 'schema.prisma');
      const content = await fs.readFile(schemaPath, 'utf-8');
      return content;
    } catch {
      return null;
    }
  }

  /**
   * List all migrations
   */
  async listMigrations(): Promise<MigrationResult> {
    try {
      const migrationsDir = path.join(this.prismaDir, 'migrations');

      // Check if migrations directory exists
      try {
        await fs.access(migrationsDir);
      } catch {
        return {
          success: true,
          operation: 'status',
          message: 'No migrations directory found',
          data: { migrations: [] },
        };
      }

      // Read migrations directory
      const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
      const migrations = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();

      return {
        success: true,
        operation: 'status',
        message: `Found ${migrations.length} migration(s)`,
        data: { migrations, count: migrations.length },
      };
    } catch (error) {
      return {
        success: false,
        operation: 'status',
        error: `Failed to list migrations: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Complete migration workflow for schema changes
   *
   * This orchestrates the full process:
   * 1. Validate schema
   * 2. Generate migration
   * 3. Apply migration
   * 4. Generate Prisma client
   */
  async handleSchemaChange(migrationName: string): Promise<{
    success: boolean;
    steps: MigrationResult[];
    error?: string;
  }> {
    const steps: MigrationResult[] = [];

    try {
      // Step 1: Validate schema
      console.log('Step 1: Validating schema...');
      const validation = await this.validateSchema();
      steps.push(validation);

      if (!validation.success) {
        return {
          success: false,
          steps,
          error: 'Schema validation failed',
        };
      }

      // Step 2: Generate migration
      console.log('Step 2: Generating migration...');
      const generation = await this.generateMigration({
        name: migrationName,
        createOnly: false,
      });
      steps.push(generation);

      if (!generation.success) {
        return {
          success: false,
          steps,
          error: 'Migration generation failed',
        };
      }

      // Step 3: Generate Prisma client
      console.log('Step 3: Generating Prisma client...');
      const clientGen = await this.generateClient();
      steps.push(clientGen);

      if (!clientGen.success) {
        return {
          success: false,
          steps,
          error: 'Prisma client generation failed',
        };
      }

      return { success: true, steps };
    } catch (error) {
      return {
        success: false,
        steps,
        error: `Migration workflow failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

/**
 * Convenience function to create a MigrationManager instance
 */
export function createMigrationManager(projectRoot?: string): MigrationManager {
  const root = projectRoot || process.cwd();
  return new MigrationManager(root);
}
