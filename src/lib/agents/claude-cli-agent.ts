import { exec } from 'child_process';
import { promisify } from 'util';
import { buildCodebaseContext, formatContextForAgent } from './codebase-context';

const execAsync = promisify(exec);

/**
 * Code modification request
 */
export interface CodeModificationRequest {
  userRequest: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  sessionId?: string;
}

/**
 * Code modification response
 */
export interface CodeModificationResponse {
  success: boolean;
  result: string;
  sessionId?: string;
  filesModified?: string[];
  error?: string;
}

/**
 * ClaudeCLIAgent
 *
 * Calls `claude` CLI directly instead of using Agent SDK.
 * This solves the nested session problem by removing CLAUDECODE from environment.
 *
 * Key differences from Agent SDK approach:
 * - Spawns `claude` CLI as subprocess with clean environment
 * - No nested session errors
 * - Can be used in tests
 * - Works when called from any Node.js process
 *
 * Usage:
 * ```typescript
 * const agent = new ClaudeCLIAgent('/path/to/staging');
 * const response = await agent.modifyCode({
 *   userRequest: 'Add a dark mode toggle'
 * });
 * ```
 */
export class ClaudeCLIAgent {
  private projectRoot: string;
  private claudePath: string;

  constructor(projectRoot: string, claudePath: string = '/Users/davcasd/.local/bin/claude') {
    this.projectRoot = projectRoot;
    this.claudePath = claudePath;
  }

  /**
   * Modify code based on user request
   * Calls claude CLI directly with clean environment
   */
  async modifyCode(request: CodeModificationRequest): Promise<CodeModificationResponse> {
    try {
      // Build codebase context for Claude
      console.log('Building codebase context...');
      const context = await buildCodebaseContext(this.projectRoot);
      const contextStr = formatContextForAgent(context);

      // Build system prompt with context and safety rules
      const systemPrompt = this.buildSystemPrompt(contextStr);

      // Build user prompt
      const userPrompt = this.buildUserPrompt(request);

      // Combine system and user prompts
      const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

      console.log('Calling Claude CLI...');

      // Prepare clean environment (remove CLAUDECODE to avoid nested session error)
      const env = { ...process.env };
      delete env.CLAUDECODE;

      // Build claude command
      // Use -p for prompt, --dangerously-skip-permissions to bypass permission checks
      const command = `${this.claudePath} -p "${this.escapePrompt(fullPrompt)}" --dangerously-skip-permissions`;

      // Execute claude CLI
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        env,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
        timeout: 300000, // 5 minute timeout
      });

      console.log('✓ Claude CLI completed');

      // Parse output
      const result = this.parseOutput(stdout, stderr);

      // Get list of modified files from git
      const filesModified = await this.getModifiedFiles();

      return {
        success: true,
        result,
        filesModified,
        sessionId: request.sessionId, // Keep same session ID (CLI doesn't track sessions)
      };
    } catch (error: any) {
      console.error('Claude CLI error:', error);

      // Check if it's the nested session error
      if (error.stderr?.includes('cannot be launched inside another Claude Code session')) {
        return {
          success: false,
          result: '',
          error: 'Nested Claude Code session detected. Make sure to run the server in a terminal without CLAUDECODE environment variable.',
        };
      }

      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Escape prompt for shell command
   */
  private escapePrompt(prompt: string): string {
    // Escape double quotes and backslashes for shell
    return prompt
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\$/g, '\\$')
      .replace(/`/g, '\\`');
  }

  /**
   * Parse Claude CLI output
   */
  private parseOutput(stdout: string, stderr: string): string {
    // Claude CLI writes its response to stdout
    // Filter out any CLI noise and extract the actual response
    const lines = stdout.split('\n');

    // Look for the actual Claude response (usually after any CLI messages)
    let responseStart = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('Claude:') || lines[i].includes('Assistant:')) {
        responseStart = i + 1;
        break;
      }
    }

    const response = lines.slice(responseStart).join('\n').trim();

    return response || stdout.trim();
  }

  /**
   * Build system prompt with codebase context and safety rules
   */
  private buildSystemPrompt(contextStr: string): string {
    return `You are an expert coding agent modifying a Next.js application in the staging environment.

${contextStr}

## YOUR ROLE

You will receive requests from administrators to modify the codebase. Use your tools (Read, Edit, Write, Bash) to implement the requested changes directly. All changes are in staging and version-controlled, so you can work confidently.

**IMPORTANT:** Follow the administrator conventions and terminology shown in the codebase context above. When administrators use terms like "admin interface", "staging", or refer to specific pages like "/admin/code", they are using the conventions documented in docs/ADMIN_GUIDE.md. If you're unsure about terminology, read that file for clarification.

## CRITICAL SAFETY RULES

1. **NEVER MODIFY PROTECTED FILES** - These are essential and off-limits:
   - Authentication: src/lib/auth.ts, src/middleware.ts, src/app/api/auth/**
   - Agent code: src/lib/code-modification/**, src/lib/agents/**
   - Configuration: .env*, package.json, tsconfig.json, next.config.ts, jest.config.*, playwright.config.*
   - Git files: .git/**, .gitignore

2. **BE CAREFUL WITH SENSITIVE FILES** - Extra validation required:
   - Database schema: prisma/schema.prisma (only modify if explicitly requested)
   - Root layout: src/app/layout.tsx
   - Core libraries: src/lib/**

3. **GENERATE QUALITY CODE**:
   - Use proper TypeScript syntax
   - Include necessary imports
   - Follow existing code patterns
   - Make production-ready changes

4. **PLAN YOUR WORK**:
   - Read existing files first
   - Understand the current structure
   - Make minimal, focused changes
   - Test your changes if possible

## WORKFLOW

1. **Read** files to understand current state
2. **Edit** existing files or **Write** new ones
3. **Bash** for git operations if needed (git status, git add, etc.)
4. Explain what you did and why

Remember: You're working in staging, all changes are version-controlled, and will be tested before production deployment. Work autonomously and make the requested changes.`;
  }

  /**
   * Build user prompt from request
   */
  private buildUserPrompt(request: CodeModificationRequest): string {
    const parts: string[] = [];

    // Add conversation history if present
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      parts.push('## CONVERSATION HISTORY\n');
      for (const msg of request.conversationHistory) {
        parts.push(`${msg.role}: ${msg.content}\n`);
      }
      parts.push('\n');
    }

    // Add current request
    parts.push('## REQUEST\n');
    parts.push(request.userRequest);
    parts.push('\n\n');
    parts.push('Please implement this request by directly modifying the files in the staging directory.');

    return parts.join('');
  }

  /**
   * Get list of modified files from git
   */
  private async getModifiedFiles(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('git diff --name-only HEAD', {
        cwd: this.projectRoot,
      });

      return stdout
        .trim()
        .split('\n')
        .filter((f) => f.length > 0);
    } catch {
      return [];
    }
  }

  /**
   * Test connection to Claude CLI
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    try {
      const env = { ...process.env };
      delete env.CLAUDECODE;

      const command = `${this.claudePath} -p "Say OK if you can hear me." --dangerously-skip-permissions`;

      const { stdout } = await execAsync(command, {
        cwd: this.projectRoot,
        env,
        timeout: 30000,
      });

      return {
        success: stdout.toLowerCase().includes('ok'),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Convenience function to create a Claude CLI Agent
 */
export function createClaudeCLIAgent(projectRoot?: string): ClaudeCLIAgent {
  const root = projectRoot || process.cwd();
  return new ClaudeCLIAgent(root);
}
