/**
 * Tests for Protected Files module
 */

import {
  isProtectedFile,
  isSensitiveFile,
  validateFileModifications,
  ProtectedFileError,
  SensitiveFileWarning,
  getProtectedPatterns,
  getSensitivePatterns,
} from '@/lib/code-modification/protected-files';

describe('Protected Files', () => {
  describe('isProtectedFile', () => {
    it('should protect authentication files', () => {
      expect(isProtectedFile('src/lib/auth.ts')).toBe(true);
      expect(isProtectedFile('src/lib/auth/utils.ts')).toBe(true);
      expect(isProtectedFile('src/app/api/auth/route.ts')).toBe(true);
      expect(isProtectedFile('src/middleware.ts')).toBe(true);
    });

    it('should protect code modification system files', () => {
      expect(isProtectedFile('src/lib/code-modification/protected-files.ts')).toBe(true);
      expect(isProtectedFile('src/lib/code-modification/file-manager.ts')).toBe(true);
      expect(isProtectedFile('src/lib/agents/coding-agent.ts')).toBe(true);
    });

    it('should protect environment and config files', () => {
      expect(isProtectedFile('.env')).toBe(true);
      expect(isProtectedFile('.env.local')).toBe(true);
      expect(isProtectedFile('.env.production')).toBe(true);
      expect(isProtectedFile('next.config.ts')).toBe(true);
      expect(isProtectedFile('package.json')).toBe(true);
      expect(isProtectedFile('tsconfig.json')).toBe(true);
    });

    it('should protect git and node_modules', () => {
      expect(isProtectedFile('.git/config')).toBe(true);
      expect(isProtectedFile('.gitignore')).toBe(true);
      expect(isProtectedFile('node_modules/react/index.js')).toBe(true);
      expect(isProtectedFile('.next/cache/webpack.js')).toBe(true);
    });

    it('should protect existing migrations', () => {
      expect(isProtectedFile('prisma/migrations/20240101_init/migration.sql')).toBe(true);
    });

    it('should NOT protect regular application files', () => {
      expect(isProtectedFile('src/app/page.tsx')).toBe(false);
      expect(isProtectedFile('src/components/Button.tsx')).toBe(false);
      expect(isProtectedFile('src/app/api/users/route.ts')).toBe(false);
    });

    it('should handle paths with leading slashes', () => {
      expect(isProtectedFile('/src/lib/auth.ts')).toBe(true);
      expect(isProtectedFile('./src/lib/auth.ts')).toBe(true);
    });
  });

  describe('isSensitiveFile', () => {
    it('should identify Prisma schema as sensitive', () => {
      expect(isSensitiveFile('prisma/schema.prisma')).toBe(true);
    });

    it('should identify root layout as sensitive', () => {
      expect(isSensitiveFile('src/app/layout.tsx')).toBe(true);
    });

    it('should identify core libraries as sensitive', () => {
      expect(isSensitiveFile('src/lib/database.ts')).toBe(true);
      expect(isSensitiveFile('src/lib/utils.ts')).toBe(true);
    });

    it('should NOT identify regular files as sensitive', () => {
      expect(isSensitiveFile('src/components/Header.tsx')).toBe(false);
      expect(isSensitiveFile('src/app/about/page.tsx')).toBe(false);
    });
  });

  describe('validateFileModifications', () => {
    it('should categorize files correctly', () => {
      const files = [
        'src/components/Button.tsx', // valid
        'src/lib/auth.ts', // protected
        'prisma/schema.prisma', // sensitive
        'src/app/api/users/route.ts', // valid
        'package.json', // protected
        'src/lib/utils.ts', // sensitive
      ];

      const result = validateFileModifications(files);

      expect(result.valid).toContain('src/components/Button.tsx');
      expect(result.valid).toContain('src/app/api/users/route.ts');
      expect(result.protected).toContain('src/lib/auth.ts');
      expect(result.protected).toContain('package.json');
      expect(result.sensitive).toContain('prisma/schema.prisma');
      expect(result.sensitive).toContain('src/lib/utils.ts');
    });

    it('should handle empty array', () => {
      const result = validateFileModifications([]);
      expect(result.valid).toEqual([]);
      expect(result.protected).toEqual([]);
      expect(result.sensitive).toEqual([]);
    });

    it('should handle all protected files', () => {
      const files = ['.env', 'package.json', 'src/middleware.ts'];
      const result = validateFileModifications(files);
      expect(result.valid).toEqual([]);
      expect(result.protected).toHaveLength(3);
    });
  });

  describe('getProtectedPatterns', () => {
    it('should return array of patterns', () => {
      const patterns = getProtectedPatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('src/lib/auth.ts');
    });
  });

  describe('getSensitivePatterns', () => {
    it('should return array of patterns', () => {
      const patterns = getSensitivePatterns();
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain('prisma/schema.prisma');
    });
  });

  describe('ProtectedFileError', () => {
    it('should create error with file path', () => {
      const error = new ProtectedFileError('src/lib/auth.ts');
      expect(error.name).toBe('ProtectedFileError');
      expect(error.message).toContain('src/lib/auth.ts');
      expect(error.message).toContain('protected');
    });
  });

  describe('SensitiveFileWarning', () => {
    it('should create warning with file path', () => {
      const warning = new SensitiveFileWarning('prisma/schema.prisma');
      expect(warning.name).toBe('SensitiveFileWarning');
      expect(warning.message).toContain('prisma/schema.prisma');
      expect(warning.message).toContain('sensitive');
    });
  });
});
