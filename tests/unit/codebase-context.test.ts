/**
 * Tests for CodebaseContextBuilder
 */

import { CodebaseContextBuilder, buildCodebaseContext } from '@/lib/agents/codebase-context';

describe('CodebaseContextBuilder', () => {
  let builder: CodebaseContextBuilder;

  beforeEach(() => {
    builder = new CodebaseContextBuilder(process.cwd());
  });

  describe('constructor', () => {
    it('should create CodebaseContextBuilder instance', () => {
      expect(builder).toBeInstanceOf(CodebaseContextBuilder);
    });
  });

  describe('build', () => {
    it('should build codebase context', async () => {
      const context = await builder.build();

      expect(context).toBeDefined();
      expect(context.projectRoot).toBe(process.cwd());
      expect(context.structure).toBeDefined();
      expect(context.dependencies).toBeDefined();
      expect(context.protectedFiles).toBeDefined();
      expect(context.sensitiveFiles).toBeDefined();
      expect(context.summary).toBeDefined();
    }, 30000);

    it('should scan file structure', async () => {
      const context = await builder.build();

      expect(context.structure.files).toBeDefined();
      expect(Array.isArray(context.structure.files)).toBe(true);
      expect(context.structure.files.length).toBeGreaterThan(0);
      expect(context.structure.totalFiles).toBeGreaterThan(0);
    }, 30000);

    it('should identify dependencies', async () => {
      const context = await builder.build();

      expect(context.dependencies.runtime).toBeDefined();
      expect(context.dependencies.dev).toBeDefined();
      expect(context.dependencies.frameworks).toBeDefined();
      expect(Array.isArray(context.dependencies.frameworks)).toBe(true);
    }, 30000);

    it('should load database schema', async () => {
      const context = await builder.build();

      // Our project has a Prisma schema
      expect(context.schema).not.toBeNull();
      if (context.schema) {
        expect(context.schema.models).toBeDefined();
        expect(Array.isArray(context.schema.models)).toBe(true);
        expect(context.schema.content).toBeDefined();
      }
    }, 30000);

    it('should list protected files', async () => {
      const context = await builder.build();

      expect(context.protectedFiles).toBeDefined();
      expect(Array.isArray(context.protectedFiles)).toBe(true);
      expect(context.protectedFiles.length).toBeGreaterThan(0);
      expect(context.protectedFiles).toContain('src/lib/auth.ts');
    }, 30000);
  });

  describe('findFiles', () => {
    it('should find files matching pattern', async () => {
      const files = await builder.findFiles('\\.test\\.ts$');

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every((f) => f.path.endsWith('.test.ts'))).toBe(true);
    }, 30000);
  });

  describe('buildCodebaseContext', () => {
    it('should be a convenience function', async () => {
      const context = await buildCodebaseContext();

      expect(context).toBeDefined();
      expect(context.projectRoot).toBeDefined();
    }, 30000);
  });
});
