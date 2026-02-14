/**
 * Tests for Validator service
 */

import { Validator, createValidator, validateCode } from '@/lib/code-modification/validator';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator(process.cwd());
  });

  describe('validateJSON', () => {
    it('should validate correct JSON', async () => {
      const content = JSON.stringify({ name: 'test', value: 123 }, null, 2);
      const result = await validator.validateJSON('test.json', content);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('json');
      expect(result.errors).toBeUndefined();
    });

    it('should reject invalid JSON', async () => {
      const content = '{ "name": "test", invalid }';
      const result = await validator.validateJSON('test.json', content);

      expect(result.valid).toBe(false);
      expect(result.type).toBe('json');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should handle empty JSON object', async () => {
      const result = await validator.validateJSON('test.json', '{}');
      expect(result.valid).toBe(true);
    });

    it('should handle JSON array', async () => {
      const result = await validator.validateJSON('test.json', '[1, 2, 3]');
      expect(result.valid).toBe(true);
    });
  });

  describe('validateJavaScript', () => {
    it('should validate correct JavaScript', async () => {
      const content = `
        function hello() {
          console.log("Hello");
        }
      `;
      const result = await validator.validateJavaScript('test.js', content);

      expect(result.valid).toBe(true);
      expect(result.type).toBe('javascript');
    });

    it('should detect unmatched braces', async () => {
      const content = `
        function hello() {
          console.log("Hello");
        // Missing closing brace
      `;
      const result = await validator.validateJavaScript('test.js', content);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.includes('braces'))).toBe(true);
    });

    it('should detect unmatched parentheses', async () => {
      const content = 'const x = (1 + 2;';
      const result = await validator.validateJavaScript('test.js', content);

      expect(result.valid).toBe(false);
      expect(result.errors!.some(e => e.includes('parentheses'))).toBe(true);
    });

    it('should detect unmatched brackets', async () => {
      const content = 'const arr = [1, 2, 3;';
      const result = await validator.validateJavaScript('test.js', content);

      expect(result.valid).toBe(false);
      expect(result.errors!.some(e => e.includes('brackets'))).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should route to JSON validator for .json files', async () => {
      const result = await validator.validateFile('test.json', '{"valid": true}');
      expect(result.type).toBe('json');
      expect(result.valid).toBe(true);
    });

    it('should route to JavaScript validator for .js files', async () => {
      const result = await validator.validateFile('test.js', 'const x = 1;');
      expect(result.type).toBe('javascript');
      expect(result.valid).toBe(true);
    });

    it('should handle other file types gracefully', async () => {
      const result = await validator.validateFile('test.txt', 'Hello World');
      expect(result.type).toBe('other');
      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
    });

    it('should handle .md files', async () => {
      const result = await validator.validateFile('README.md', '# Title\n\nContent');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('other');
    });

    it('should handle .css files', async () => {
      const result = await validator.validateFile('styles.css', 'body { margin: 0; }');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('other');
    });
  });

  describe('validateFiles', () => {
    it('should validate multiple files', async () => {
      const files = [
        { filePath: 'test1.json', content: '{"valid": true}' },
        { filePath: 'test2.js', content: 'const x = 1;' },
        { filePath: 'test3.txt', content: 'Hello' },
      ];

      const result = await validator.validateFiles(files);

      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect errors across multiple files', async () => {
      const files = [
        { filePath: 'test1.json', content: '{"valid": true}' },
        { filePath: 'test2.json', content: '{invalid}' },
        { filePath: 'test3.js', content: 'const x = (1 + 2;' },
      ];

      const result = await validator.validateFiles(files);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.includes('test2.json'))).toBe(true);
      expect(result.errors.some(e => e.includes('test3.js'))).toBe(true);
    });

    it('should handle empty file list', async () => {
      const result = await validator.validateFiles([]);

      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('createValidator', () => {
    it('should create a Validator instance', () => {
      const v = createValidator();
      expect(v).toBeInstanceOf(Validator);
    });

    it('should accept custom project root', () => {
      const v = createValidator('/custom/path');
      expect(v).toBeInstanceOf(Validator);
    });
  });

  describe('validateCode', () => {
    it('should be a convenience function', async () => {
      const result = await validateCode('test.json', '{"valid": true}');
      expect(result.valid).toBe(true);
      expect(result.type).toBe('json');
    });
  });

  // Note: TypeScript and Prisma validation tests are skipped because they require
  // actual file system operations and external tools (tsc, prisma).
  // These should be tested in integration tests or manually.

  describe.skip('validateTypeScript (integration)', () => {
    it('should validate correct TypeScript', async () => {
      const content = `
        export function add(a: number, b: number): number {
          return a + b;
        }
      `;
      const result = await validator.validateTypeScript('test.ts', content);
      expect(result.valid).toBe(true);
    });

    it('should detect TypeScript errors', async () => {
      const content = `
        export function add(a: number, b: number): number {
          return a + b + "string"; // Type error
        }
      `;
      const result = await validator.validateTypeScript('test.ts', content);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe.skip('validatePrisma (integration)', () => {
    it('should validate correct Prisma schema', async () => {
      const content = `
        generator client {
          provider = "prisma-client-js"
        }

        datasource db {
          provider = "sqlite"
          url      = env("DATABASE_URL")
        }

        model User {
          id    Int    @id @default(autoincrement())
          email String @unique
          name  String
        }
      `;
      const result = await validator.validatePrisma('prisma/schema.prisma', content);
      expect(result.valid).toBe(true);
    });
  });
});
