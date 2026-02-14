/**
 * Tests for MigrationManager service
 */

import { MigrationManager, createMigrationManager } from '@/lib/code-modification/migration-manager';

describe('MigrationManager', () => {
  let migrationManager: MigrationManager;

  beforeEach(() => {
    migrationManager = new MigrationManager(process.cwd());
  });

  describe('constructor', () => {
    it('should create MigrationManager instance', () => {
      expect(migrationManager).toBeInstanceOf(MigrationManager);
    });
  });

  describe('schemaExists', () => {
    it('should check if schema file exists', async () => {
      const exists = await migrationManager.schemaExists();
      expect(typeof exists).toBe('boolean');
      expect(exists).toBe(true); // Our project has a schema
    });
  });

  describe('readSchema', () => {
    it('should read schema file', async () => {
      const schema = await migrationManager.readSchema();

      expect(schema).not.toBeNull();
      expect(typeof schema).toBe('string');
      if (schema) {
        expect(schema.length).toBeGreaterThan(0);
        expect(schema).toContain('datasource');
        expect(schema).toContain('generator');
      }
    });
  });

  describe('listMigrations', () => {
    it('should list migrations', async () => {
      const result = await migrationManager.listMigrations();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
      expect(result.data).toBeDefined();
      expect(result.data.migrations).toBeDefined();
      expect(Array.isArray(result.data.migrations)).toBe(true);
    });

    it('should return migration count', async () => {
      const result = await migrationManager.listMigrations();

      expect(result.data.count).toBeDefined();
      expect(typeof result.data.count).toBe('number');
      expect(result.data.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('createMigrationManager', () => {
    it('should create a MigrationManager instance', () => {
      const mm = createMigrationManager();
      expect(mm).toBeInstanceOf(MigrationManager);
    });

    it('should accept custom project root', () => {
      const mm = createMigrationManager(process.cwd());
      expect(mm).toBeInstanceOf(MigrationManager);
    });
  });

  // The following tests are skipped because they modify the database
  // These should be tested in integration tests with a test database

  describe.skip('validateSchema (integration)', () => {
    it('should validate Prisma schema', async () => {
      const result = await migrationManager.validateSchema();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('validate');
    });
  });

  describe.skip('generateMigration (integration)', () => {
    it('should generate a migration', async () => {
      const result = await migrationManager.generateMigration({
        name: 'test_migration',
        createOnly: true,
      });

      expect(result.success).toBe(true);
      expect(result.operation).toBe('generate');
      expect(result.data.name).toBe('test_migration');
    });
  });

  describe.skip('applyMigrations (integration)', () => {
    it('should apply pending migrations', async () => {
      const result = await migrationManager.applyMigrations();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('apply');
    });
  });

  describe.skip('getStatus (integration)', () => {
    it('should get migration status', async () => {
      const result = await migrationManager.getStatus();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('status');
    });
  });

  describe.skip('generateClient (integration)', () => {
    it('should generate Prisma client', async () => {
      const result = await migrationManager.generateClient();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('generate');
    });
  });

  describe.skip('resetDatabase (integration)', () => {
    it('should reset database', async () => {
      const result = await migrationManager.resetDatabase();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('rollback');
    });
  });

  describe.skip('resolveMigration (integration)', () => {
    it('should resolve failed migration state', async () => {
      const result = await migrationManager.resolveMigration();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('apply');
    });
  });

  describe.skip('handleSchemaChange (integration)', () => {
    it('should orchestrate full migration workflow', async () => {
      const result = await migrationManager.handleSchemaChange('test_workflow');

      expect(result.success).toBe(true);
      expect(result.steps).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(0);
    });
  });
});
