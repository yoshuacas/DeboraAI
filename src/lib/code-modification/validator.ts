import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';

const execAsync = promisify(exec);

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  filePath: string;
  type: 'typescript' | 'json' | 'prisma' | 'javascript' | 'other';
  errors?: string[];
  warnings?: string[];
}

/**
 * Validator Service
 *
 * Validates code before applying changes to prevent syntax errors and broken code.
 *
 * Supports:
 * - TypeScript syntax and type checking
 * - JSON format validation
 * - Prisma schema validation
 * - Basic JavaScript syntax
 *
 * Usage:
 * ```typescript
 * const validator = new Validator('/path/to/project');
 * const result = await validator.validateTypeScript('src/app/page.tsx', content);
 * if (!result.valid) {
 *   console.error('Validation failed:', result.errors);
 * }
 * ```
 */
export class Validator {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Validate file based on extension
   */
  async validateFile(filePath: string, content: string): Promise<ValidationResult> {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case '.ts':
      case '.tsx':
        return this.validateTypeScript(filePath, content);

      case '.js':
      case '.jsx':
        return this.validateJavaScript(filePath, content);

      case '.json':
        return this.validateJSON(filePath, content);

      case '.prisma':
        return this.validatePrisma(filePath, content);

      default:
        // For other file types, just check if content is valid string
        return {
          valid: true,
          filePath,
          type: 'other',
          warnings: ['No specific validation for this file type'],
        };
    }
  }

  /**
   * Validate TypeScript syntax and types
   */
  async validateTypeScript(filePath: string, content: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Basic syntax check using TypeScript compiler API would be ideal,
      // but for simplicity, we'll write to temp file and use tsc --noEmit
      // Preserve file extension (ts vs tsx) for proper JSX parsing
      const ext = path.extname(filePath);
      const tempFile = path.join(this.projectRoot, `.tmp_validation${ext}`);

      try {
        await fs.writeFile(tempFile, content, 'utf-8');

        // Run TypeScript compiler check
        const { stdout, stderr } = await execAsync(
          `npx tsc --noEmit --skipLibCheck --jsx preserve ${tempFile}`,
          {
            cwd: this.projectRoot,
            timeout: 10000,
          }
        );

        if (stderr && !stderr.includes('error TS')) {
          warnings.push(stderr);
        }

        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        return {
          valid: true,
          filePath,
          type: 'typescript',
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      } catch (error: any) {
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});

        // Parse TypeScript errors
        if (error.stdout) {
          const errorLines = error.stdout.split('\n').filter((line: string) => line.includes('error TS'));
          errors.push(...errorLines);
        }

        if (errors.length === 0 && error.message) {
          errors.push(error.message);
        }

        return {
          valid: false,
          filePath,
          type: 'typescript',
          errors,
        };
      }
    } catch (error) {
      return {
        valid: false,
        filePath,
        type: 'typescript',
        errors: [`TypeScript validation error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Validate JavaScript syntax
   */
  async validateJavaScript(filePath: string, content: string): Promise<ValidationResult> {
    try {
      // Basic syntax check by trying to parse as JavaScript
      // In Node.js, we can use vm.Script or eval (with caution)
      // For safety, we'll use a simple regex-based check

      // Check for common syntax errors
      const errors: string[] = [];

      // Check for unmatched brackets
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
      }

      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        errors.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
      }

      const openBrackets = (content.match(/\[/g) || []).length;
      const closeBrackets = (content.match(/\]/g) || []).length;
      if (openBrackets !== closeBrackets) {
        errors.push(`Unmatched brackets: ${openBrackets} open, ${closeBrackets} close`);
      }

      if (errors.length > 0) {
        return {
          valid: false,
          filePath,
          type: 'javascript',
          errors,
        };
      }

      return {
        valid: true,
        filePath,
        type: 'javascript',
      };
    } catch (error) {
      return {
        valid: false,
        filePath,
        type: 'javascript',
        errors: [`JavaScript validation error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Validate JSON format
   */
  async validateJSON(filePath: string, content: string): Promise<ValidationResult> {
    try {
      JSON.parse(content);

      return {
        valid: true,
        filePath,
        type: 'json',
      };
    } catch (error: any) {
      return {
        valid: false,
        filePath,
        type: 'json',
        errors: [`JSON parse error: ${error.message}`],
      };
    }
  }

  /**
   * Validate Prisma schema
   */
  async validatePrisma(filePath: string, content: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Write content to actual schema file temporarily
      const schemaPath = path.join(this.projectRoot, 'prisma/schema.prisma');
      const backupPath = `${schemaPath}.backup`;

      try {
        // Backup original schema
        await fs.copyFile(schemaPath, backupPath).catch(() => {});

        // Write new schema
        await fs.writeFile(schemaPath, content, 'utf-8');

        // Run Prisma validate
        const { stdout, stderr } = await execAsync('npx prisma validate', {
          cwd: this.projectRoot,
          timeout: 15000,
        });

        // Restore original schema
        await fs.copyFile(backupPath, schemaPath).catch(() => {});
        await fs.unlink(backupPath).catch(() => {});

        if (stderr) {
          warnings.push(stderr);
        }

        return {
          valid: true,
          filePath,
          type: 'prisma',
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      } catch (error: any) {
        // Restore original schema
        await fs.copyFile(backupPath, schemaPath).catch(() => {});
        await fs.unlink(backupPath).catch(() => {});

        if (error.stdout) {
          errors.push(error.stdout);
        }
        if (error.stderr) {
          errors.push(error.stderr);
        }

        if (errors.length === 0) {
          errors.push(error.message || 'Unknown Prisma validation error');
        }

        return {
          valid: false,
          filePath,
          type: 'prisma',
          errors,
        };
      }
    } catch (error) {
      return {
        valid: false,
        filePath,
        type: 'prisma',
        errors: [`Prisma validation error: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  /**
   * Validate multiple files
   */
  async validateFiles(
    files: Array<{ filePath: string; content: string }>
  ): Promise<{
    valid: boolean;
    results: ValidationResult[];
    errors: string[];
  }> {
    const results: ValidationResult[] = [];
    const allErrors: string[] = [];

    for (const file of files) {
      const result = await this.validateFile(file.filePath, file.content);
      results.push(result);

      if (!result.valid && result.errors) {
        allErrors.push(`${file.filePath}: ${result.errors.join(', ')}`);
      }
    }

    const allValid = results.every((r) => r.valid);

    return {
      valid: allValid,
      results,
      errors: allErrors,
    };
  }
}

/**
 * Convenience function to create a Validator instance
 */
export function createValidator(projectRoot?: string): Validator {
  const root = projectRoot || process.cwd();
  return new Validator(root);
}

/**
 * Quick validation helper
 */
export async function validateCode(
  filePath: string,
  content: string,
  projectRoot?: string
): Promise<ValidationResult> {
  const validator = createValidator(projectRoot);
  return validator.validateFile(filePath, content);
}
