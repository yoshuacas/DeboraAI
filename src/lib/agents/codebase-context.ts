import { promises as fs } from 'fs';
import * as path from 'path';
import { createGitManager } from '../code-modification/git-manager';
import { getProtectedPatterns, getSensitivePatterns } from '../code-modification/protected-files';

/**
 * Codebase context structure
 */
export interface CodebaseContext {
  projectRoot: string;
  structure: FileStructure;
  dependencies: Dependencies;
  schema: DatabaseSchema | null;
  recentChanges: RecentChange[];
  protectedFiles: string[];
  sensitiveFiles: string[];
  summary: string;
}

/**
 * File structure
 */
export interface FileStructure {
  directories: string[];
  files: FileInfo[];
  totalFiles: number;
  totalLines: number;
}

/**
 * File information
 */
export interface FileInfo {
  path: string;
  type: string;
  size: number;
  lines?: number;
}

/**
 * Dependencies
 */
export interface Dependencies {
  runtime: Record<string, string>;
  dev: Record<string, string>;
  frameworks: string[];
}

/**
 * Database schema info
 */
export interface DatabaseSchema {
  models: string[];
  content: string;
}

/**
 * Recent git change
 */
export interface RecentChange {
  hash: string;
  date: string;
  message: string;
  author: string;
  files: string[];
}

/**
 * CodebaseContextBuilder
 *
 * Scans the entire codebase and creates comprehensive context for the AI agent.
 * This allows the agent to understand:
 * - Project structure and organization
 * - Available dependencies and frameworks
 * - Database schema and models
 * - Recent changes and patterns
 * - Which files are protected or sensitive
 *
 * Usage:
 * ```typescript
 * const builder = new CodebaseContextBuilder('/path/to/project');
 * const context = await builder.build();
 * ```
 */
export class CodebaseContextBuilder {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Build complete codebase context
   */
  async build(): Promise<CodebaseContext> {
    console.log('Building codebase context...');

    const [structure, dependencies, schema, recentChanges] = await Promise.all([
      this.scanStructure(),
      this.getDependencies(),
      this.getDatabaseSchema(),
      this.getRecentChanges(),
    ]);

    const protectedFiles = getProtectedPatterns();
    const sensitiveFiles = getSensitivePatterns();

    const summary = this.generateSummary(structure, dependencies, schema);

    return {
      projectRoot: this.projectRoot,
      structure,
      dependencies,
      schema,
      recentChanges,
      protectedFiles,
      sensitiveFiles,
      summary,
    };
  }

  /**
   * Scan project structure
   */
  private async scanStructure(): Promise<FileStructure> {
    const directories: string[] = [];
    const files: FileInfo[] = [];
    let totalLines = 0;

    const ignoreDirs = ['node_modules', '.next', 'dist', 'build', 'coverage', '.git'];

    async function scan(dir: string, baseDir: string): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (entry.isDirectory()) {
          if (!ignoreDirs.includes(entry.name)) {
            directories.push(relativePath);
            await scan(fullPath, baseDir);
          }
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          const ext = path.extname(entry.name);

          const fileInfo: FileInfo = {
            path: relativePath,
            type: ext || 'no-extension',
            size: stats.size,
          };

          // Count lines for text files
          if (['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.css', '.prisma'].includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const lines = content.split('\n').length;
              fileInfo.lines = lines;
              totalLines += lines;
            } catch (error) {
              // Skip if can't read file
            }
          }

          files.push(fileInfo);
        }
      }
    }

    await scan(this.projectRoot, this.projectRoot);

    return {
      directories,
      files,
      totalFiles: files.length,
      totalLines,
    };
  }

  /**
   * Get dependencies from package.json
   */
  private async getDependencies(): Promise<Dependencies> {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);

      const runtime = packageJson.dependencies || {};
      const dev = packageJson.devDependencies || {};

      // Identify key frameworks
      const frameworks: string[] = [];
      if (runtime.next) frameworks.push('Next.js');
      if (runtime.react) frameworks.push('React');
      if (runtime['@prisma/client']) frameworks.push('Prisma');
      if (runtime['next-auth']) frameworks.push('NextAuth');
      if (dev.jest) frameworks.push('Jest');
      if (dev['@playwright/test']) frameworks.push('Playwright');

      return { runtime, dev, frameworks };
    } catch (error) {
      return { runtime: {}, dev: {}, frameworks: [] };
    }
  }

  /**
   * Get database schema from Prisma
   */
  private async getDatabaseSchema(): Promise<DatabaseSchema | null> {
    try {
      const schemaPath = path.join(this.projectRoot, 'prisma/schema.prisma');
      const content = await fs.readFile(schemaPath, 'utf-8');

      // Extract model names
      const modelRegex = /model\s+(\w+)\s*{/g;
      const models: string[] = [];
      let match;

      while ((match = modelRegex.exec(content)) !== null) {
        models.push(match[1]);
      }

      return { models, content };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get recent git changes
   */
  private async getRecentChanges(): Promise<RecentChange[]> {
    try {
      const gitManager = createGitManager(this.projectRoot);
      const logResult = await gitManager.getLog(10);

      if (!logResult.success || !logResult.data?.commits) {
        return [];
      }

      return logResult.data.commits.map((commit: any) => ({
        hash: commit.hash,
        date: commit.date,
        message: commit.message,
        author: commit.author,
        files: [], // simple-git doesn't include files in log by default
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    structure: FileStructure,
    dependencies: Dependencies,
    schema: DatabaseSchema | null
  ): string {
    const lines: string[] = [];

    lines.push('# Project Summary\n');

    // Project stats
    lines.push(`- Total files: ${structure.totalFiles}`);
    lines.push(`- Total lines of code: ${structure.totalLines.toLocaleString()}`);
    lines.push(`- Directories: ${structure.directories.length}`);

    // Frameworks
    if (dependencies.frameworks.length > 0) {
      lines.push(`\n## Frameworks & Tools`);
      dependencies.frameworks.forEach((fw) => lines.push(`- ${fw}`));
    }

    // Database models
    if (schema && schema.models.length > 0) {
      lines.push(`\n## Database Models`);
      schema.models.forEach((model) => lines.push(`- ${model}`));
    }

    // File types
    const fileTypes = new Map<string, number>();
    structure.files.forEach((file) => {
      const count = fileTypes.get(file.type) || 0;
      fileTypes.set(file.type, count + 1);
    });

    lines.push(`\n## File Types`);
    Array.from(fileTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        lines.push(`- ${type}: ${count} file(s)`);
      });

    return lines.join('\n');
  }

  /**
   * Get context for specific directories
   */
  async getDirectoryContext(dirPath: string): Promise<FileInfo[]> {
    const structure = await this.scanStructure();
    const normalizedPath = dirPath.replace(/^\//, '');

    return structure.files.filter((file) => file.path.startsWith(normalizedPath));
  }

  /**
   * Search for files matching pattern
   */
  async findFiles(pattern: string): Promise<FileInfo[]> {
    const structure = await this.scanStructure();
    const regex = new RegExp(pattern, 'i');

    return structure.files.filter((file) => regex.test(file.path));
  }
}

/**
 * Convenience function to build codebase context
 */
export async function buildCodebaseContext(projectRoot?: string): Promise<CodebaseContext> {
  const root = projectRoot || process.cwd();
  const builder = new CodebaseContextBuilder(root);
  return await builder.build();
}

/**
 * Format context for AI agent prompt
 */
export function formatContextForAgent(context: CodebaseContext): string {
  const lines: string[] = [];

  lines.push('=== CODEBASE CONTEXT ===\n');

  // Summary
  lines.push(context.summary);

  // Protected files warning
  lines.push('\n## ⚠️ PROTECTED FILES (CANNOT MODIFY)');
  lines.push('The following file patterns are PROTECTED and you MUST NOT modify them:');
  context.protectedFiles.slice(0, 20).forEach((pattern) => lines.push(`- ${pattern}`));
  if (context.protectedFiles.length > 20) {
    lines.push(`... and ${context.protectedFiles.length - 20} more patterns`);
  }

  // Sensitive files warning
  lines.push('\n## ⚠️ SENSITIVE FILES (REQUIRE EXTRA CARE)');
  lines.push('These files require extra validation and careful modifications:');
  context.sensitiveFiles.forEach((pattern) => lines.push(`- ${pattern}`));

  // Database schema
  if (context.schema) {
    lines.push('\n## Database Schema');
    lines.push('```prisma');
    lines.push(context.schema.content);
    lines.push('```');
  }

  // Recent changes
  if (context.recentChanges.length > 0) {
    lines.push('\n## Recent Changes');
    context.recentChanges.slice(0, 5).forEach((change) => {
      lines.push(`- ${change.date}: ${change.message} (by ${change.author})`);
    });
  }

  // Directory structure (top-level only)
  const topLevelDirs = context.structure.directories
    .filter((dir) => !dir.includes('/'))
    .slice(0, 15);

  if (topLevelDirs.length > 0) {
    lines.push('\n## Top-Level Directories');
    topLevelDirs.forEach((dir) => lines.push(`- ${dir}/`));
  }

  lines.push('\n=== END CODEBASE CONTEXT ===\n');

  return lines.join('\n');
}
