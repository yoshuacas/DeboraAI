import { query, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';
import { buildCodebaseContext, formatContextForAgent } from './codebase-context';

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
 * ClaudeAgent
 *
 * Uses the Claude Agent SDK to autonomously modify code in the staging directory.
 * Claude directly reads, edits, and writes files using its built-in tools.
 *
 * Key features:
 * - Direct file modification (no JSON parsing)
 * - Version control safety (all changes are git-tracked)
 * - Protected files enforcement via system prompt
 * - Session management for conversation context
 *
 * Usage:
 * ```typescript
 * const agent = new ClaudeAgent('/path/to/staging');
 * const response = await agent.modifyCode({
 *   userRequest: 'Add a dark mode toggle'
 * });
 * ```
 */
export class ClaudeAgent {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  /**
   * Modify code based on user request
   * Claude directly edits files in the staging directory
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

      console.log('Calling Claude Agent SDK...');

      // Track session ID and result
      let sessionId: string | undefined;
      let result = '';
      let hasError = false;
      let errorMessage = '';

      // Configure agent options
      const options: ClaudeAgentOptions = {
        // Allow Claude to read, edit, write files and run commands
        allowedTools: [
          'Read',
          'Edit',
          'Write',
          'Glob',
          'Grep',
          'Bash(git *)', // Allow git commands only
        ],
        // Automatically approve all allowed tools (no interactive prompts)
        permissionMode: 'bypassPermissions',
        // Set working directory to staging
        cwd: this.projectRoot,
        // Add system prompt with codebase context
        appendSystemPrompt: systemPrompt,
        // Resume session if provided
        ...(request.sessionId && { resume: request.sessionId }),
      };

      // Check if we should use AWS Bedrock
      if (process.env.CLAUDE_CODE_USE_BEDROCK === '1' || process.env.AWS_ACCESS_KEY_ID) {
        console.log('Using AWS Bedrock for Claude API...');
        // Agent SDK will automatically use Bedrock if CLAUDE_CODE_USE_BEDROCK=1
      }

      // Execute the agent
      for await (const message of query({
        prompt: userPrompt,
        options,
      })) {
        // Capture session ID from init message
        if (message.type === 'system' && message.subtype === 'init') {
          sessionId = message.session_id;
        }

        // Capture final result
        if ('result' in message) {
          result = message.result || '';
        }

        // Check for errors
        if (message.type === 'system' && message.subtype === 'error') {
          hasError = true;
          errorMessage = (message as any).content || 'Unknown error';
        }

        // Stream messages for debugging (in development)
        if (process.env.NODE_ENV === 'development') {
          if (message.type === 'text') {
            console.log('[Claude]:', (message as any).content?.substring(0, 100));
          } else if (message.type === 'tool_use') {
            const toolMsg = message as any;
            console.log(`[Tool]: ${toolMsg.tool_name}`, toolMsg.tool_input?.file_path || '');
          }
        }
      }

      if (hasError) {
        return {
          success: false,
          result: '',
          sessionId,
          error: errorMessage,
        };
      }

      // Get list of modified files from git
      const filesModified = await this.getModifiedFiles();

      return {
        success: true,
        result,
        sessionId,
        filesModified,
      };
    } catch (error) {
      console.error('Claude Agent error:', error);
      return {
        success: false,
        result: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build system prompt with codebase context and safety rules
   */
  private buildSystemPrompt(contextStr: string): string {
    return `You are an expert coding agent modifying a Next.js application in the staging environment.

${contextStr}

## YOUR ROLE

You will receive requests to modify the codebase. Use your tools (Read, Edit, Write, Bash) to implement the requested changes directly. All changes are in staging and version-controlled, so you can work confidently.

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
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

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
   * Test connection to Claude API
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    try {
      let result = '';

      for await (const message of query({
        prompt: 'Say "OK" if you can hear me.',
        options: {
          allowedTools: [],
          permissionMode: 'bypassPermissions',
          cwd: this.projectRoot,
        },
      })) {
        if ('result' in message) {
          result = message.result || '';
        }
      }

      return {
        success: result.toLowerCase().includes('ok'),
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
 * Convenience function to create a Claude Agent
 */
export function createClaudeAgent(projectRoot?: string): ClaudeAgent {
  const root = projectRoot || process.cwd();
  return new ClaudeAgent(root);
}
