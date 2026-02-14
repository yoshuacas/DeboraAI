/**
 * Protected Files Configuration
 *
 * This module defines which files the AI coding agent CANNOT modify.
 * These are critical system files that, if modified incorrectly, could:
 * - Break authentication and lock users out
 * - Compromise security
 * - Corrupt the application
 * - Allow the agent to modify its own safety mechanisms
 *
 * IMPORTANT: The agent should NEVER be allowed to modify these files.
 */

/**
 * List of protected file patterns
 * Uses glob patterns for flexible matching
 */
export const PROTECTED_FILE_PATTERNS = [
  // Authentication & Security
  'src/lib/auth.ts',
  'src/lib/auth/**/*',
  'src/app/api/auth/**/*',
  'src/middleware.ts',

  // Code Modification System (Agent's own code)
  'src/lib/code-modification/**/*',
  'src/lib/agents/**/*',

  // Environment & Configuration
  '.env',
  '.env.*',
  '.env.local',
  '.env.production',
  '.env.development',
  'next.config.*',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'jest.config.*',
  'playwright.config.*',

  // Git & Version Control
  '.git/**/*',
  '.gitignore',
  '.gitattributes',

  // Database Configuration (schema can be modified, but carefully)
  'prisma/migrations/**/*', // Don't modify existing migrations
  'prisma.config.ts',

  // Build & Node Modules
  'node_modules/**/*',
  '.next/**/*',
  'dist/**/*',
  'build/**/*',
  'out/**/*',

  // CI/CD & Deployment
  '.github/**/*',
  'Dockerfile',
  'docker-compose.yml',
  '.dockerignore',
  'ecosystem.config.js', // PM2 config

  // Documentation & Meta (agent shouldn't modify its own docs)
  'IMPLEMENTATION_STATUS.md',
  'QUICK_START.md',
  'tests/README.md',

  // Root configuration files
  'postcss.config.*',
  'tailwind.config.*',
  'eslint.config.*',
];

/**
 * Files that require special approval or extra validation
 * Agent can modify these, but only with extra care
 */
export const SENSITIVE_FILE_PATTERNS = [
  'prisma/schema.prisma', // Database schema - requires migration generation
  'src/app/layout.tsx', // Root layout - affects entire app
  'src/app/page.tsx', // Homepage
  'src/lib/**/*.ts', // Core libraries
];

/**
 * Check if a file path is protected
 *
 * @param filePath - The file path to check (relative to project root)
 * @returns true if the file is protected, false otherwise
 */
export function isProtectedFile(filePath: string): boolean {
  // Normalize path (remove leading ./ or /)
  const normalizedPath = filePath.replace(/^\.?\//, '');

  return PROTECTED_FILE_PATTERNS.some((pattern) => {
    // Convert glob pattern to regex
    // First, escape dots
    let regexPattern = pattern.replace(/\./g, '\\.');

    // Then handle ** (matches any path segments)
    regexPattern = regexPattern.replace(/\*\*\//g, '(.+/)?'); // **/ matches zero or more path segments
    regexPattern = regexPattern.replace(/\/\*\*/g, '(/.*)?'); // /** at end matches everything after

    // Then handle * (matches any characters except /)
    regexPattern = regexPattern.replace(/\*/g, '[^/]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  });
}

/**
 * Check if a file is sensitive and requires extra validation
 *
 * @param filePath - The file path to check (relative to project root)
 * @returns true if the file is sensitive, false otherwise
 */
export function isSensitiveFile(filePath: string): boolean {
  const normalizedPath = filePath.replace(/^\.?\//, '');

  return SENSITIVE_FILE_PATTERNS.some((pattern) => {
    // Convert glob pattern to regex
    let regexPattern = pattern.replace(/\./g, '\\.');
    regexPattern = regexPattern.replace(/\*\*\//g, '(.+/)?');
    regexPattern = regexPattern.replace(/\/\*\*/g, '(/.*)?');
    regexPattern = regexPattern.replace(/\*/g, '[^/]*');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(normalizedPath);
  });
}

/**
 * Get all protected file patterns
 */
export function getProtectedPatterns(): string[] {
  return [...PROTECTED_FILE_PATTERNS];
}

/**
 * Get all sensitive file patterns
 */
export function getSensitivePatterns(): string[] {
  return [...SENSITIVE_FILE_PATTERNS];
}

/**
 * Validate that a list of files can be modified
 *
 * @param filePaths - Array of file paths to validate
 * @returns Object with valid files and protected files
 */
export function validateFileModifications(filePaths: string[]): {
  valid: string[];
  protected: string[];
  sensitive: string[];
} {
  const valid: string[] = [];
  const protectedFiles: string[] = [];
  const sensitive: string[] = [];

  for (const filePath of filePaths) {
    if (isProtectedFile(filePath)) {
      protectedFiles.push(filePath);
    } else if (isSensitiveFile(filePath)) {
      sensitive.push(filePath);
    } else {
      valid.push(filePath);
    }
  }

  return { valid, protected: protectedFiles, sensitive };
}

/**
 * Error thrown when attempting to modify a protected file
 */
export class ProtectedFileError extends Error {
  constructor(filePath: string) {
    super(
      `Cannot modify protected file: ${filePath}\n` +
      `This file is critical to system security and operation.\n` +
      `Protected files include: authentication, configuration, and the agent's own code.`
    );
    this.name = 'ProtectedFileError';
  }
}

/**
 * Warning for sensitive file modifications
 */
export class SensitiveFileWarning extends Error {
  constructor(filePath: string) {
    super(
      `Warning: Modifying sensitive file: ${filePath}\n` +
      `This file requires extra validation and careful review.\n` +
      `Ensure all changes are tested thoroughly.`
    );
    this.name = 'SensitiveFileWarning';
  }
}
