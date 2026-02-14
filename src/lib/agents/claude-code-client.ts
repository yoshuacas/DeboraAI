import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Claude Code message format
 */
export interface ClaudeCodeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude Code request options
 */
export interface ClaudeCodeRequestOptions {
  messages: ClaudeCodeMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  allowedTools?: string[];
  continueConversation?: boolean;
  sessionId?: string;
}

/**
 * Claude Code response
 */
export interface ClaudeCodeResponse {
  success: boolean;
  content: string;
  sessionId?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

/**
 * ClaudeCodeClient
 *
 * Client for Claude Code CLI programmatic interface.
 * Uses the `claude -p` command to run Claude Code headlessly.
 *
 * Configuration:
 * - Claude Code must be installed and authenticated
 * - Run `claude` once interactively to set up authentication
 *
 * Usage:
 * ```typescript
 * const client = new ClaudeCodeClient('/path/to/project');
 * const response = await client.invokeModel({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   system: 'You are a helpful assistant'
 * });
 * ```
 */
export class ClaudeCodeClient {
  private projectRoot: string;
  private lastSessionId?: string;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
  }

  /**
   * Invoke Claude Code with a request
   */
  async invokeModel(options: ClaudeCodeRequestOptions): Promise<ClaudeCodeResponse> {
    try {
      // Validate messages
      if (!options.messages || options.messages.length === 0) {
        return {
          success: false,
          content: '',
          error: 'No messages provided',
        };
      }

      // Build the prompt from messages
      const prompt = this.buildPrompt(options.messages);

      // Build CLI command
      const command = this.buildCommand(prompt, options);

      // Execute Claude Code CLI
      // Unset CLAUDECODE env var to allow nested execution
      const env = { ...process.env };
      delete env.CLAUDECODE;

      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectRoot,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
        env,
      });

      if (stderr && !stderr.includes('warning')) {
        console.warn('Claude Code stderr:', stderr);
      }

      // Parse JSON response
      const response = JSON.parse(stdout);

      // Extract session ID for potential continuation
      if (response.session_id) {
        this.lastSessionId = response.session_id;
      }

      return {
        success: true,
        content: response.result || '',
        sessionId: response.session_id,
        usage: response.usage
          ? {
              inputTokens: response.usage.input_tokens || 0,
              outputTokens: response.usage.output_tokens || 0,
            }
          : undefined,
      };
    } catch (error: any) {
      console.error('Claude Code CLI error:', error);

      // Try to parse error output as JSON
      if (error.stdout) {
        try {
          const errorResponse = JSON.parse(error.stdout);
          return {
            success: false,
            content: '',
            error: errorResponse.error || 'Unknown Claude Code error',
          };
        } catch {
          // Not JSON, use raw error
        }
      }

      return {
        success: false,
        content: '',
        error: error.message || 'Unknown Claude Code CLI error',
      };
    }
  }

  /**
   * Build prompt from messages
   */
  private buildPrompt(messages: ClaudeCodeMessage[]): string {
    // For single user message, use directly
    if (messages.length === 1 && messages[0].role === 'user') {
      return messages[0].content;
    }

    // For conversation history, format as dialogue
    const lines: string[] = [];
    for (const msg of messages) {
      if (msg.role === 'user') {
        lines.push(`User: ${msg.content}`);
      } else {
        lines.push(`Assistant: ${msg.content}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Build CLI command
   */
  private buildCommand(prompt: string, options: ClaudeCodeRequestOptions): string {
    const parts: string[] = ['claude', '-p'];

    // Add prompt (properly escaped)
    parts.push(this.escapeShellArg(prompt));

    // Add system prompt if provided
    if (options.system) {
      parts.push('--append-system-prompt');
      parts.push(this.escapeShellArg(options.system));
    }

    // Add allowed tools - we don't want Claude to modify files directly
    // Instead, we want it to analyze and return recommendations
    // So we limit to Read tool only for safety
    if (options.allowedTools && options.allowedTools.length > 0) {
      parts.push('--allowedTools');
      parts.push(`"${options.allowedTools.join(',')}"`);
    }

    // Continue conversation if requested
    if (options.continueConversation && this.lastSessionId) {
      parts.push('--resume');
      parts.push(this.lastSessionId);
    } else if (options.sessionId) {
      parts.push('--resume');
      parts.push(options.sessionId);
    }

    // Always request JSON output
    parts.push('--output-format');
    parts.push('json');

    return parts.join(' ');
  }

  /**
   * Escape shell argument
   */
  private escapeShellArg(arg: string): string {
    // Replace single quotes with '\'' and wrap in single quotes
    return `'${arg.replace(/'/g, "'\\''")}'`;
  }

  /**
   * Simple text completion
   */
  async complete(prompt: string, systemPrompt?: string): Promise<ClaudeCodeResponse> {
    return this.invokeModel({
      messages: [{ role: 'user', content: prompt }],
      ...(systemPrompt && { system: systemPrompt }),
    });
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: ClaudeCodeMessage[],
    systemPrompt?: string
  ): Promise<ClaudeCodeResponse> {
    return this.invokeModel({
      messages,
      ...(systemPrompt && { system: systemPrompt }),
    });
  }

  /**
   * Get last session ID
   */
  getLastSessionId(): string | undefined {
    return this.lastSessionId;
  }

  /**
   * Set project root directory
   */
  setProjectRoot(projectRoot: string): void {
    this.projectRoot = projectRoot;
  }

  /**
   * Test connection to Claude Code
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await this.complete('Hello! Please respond with just "OK".');

      return {
        success: response.success,
        error: response.error,
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
 * Convenience function to create a Claude Code client
 */
export function createClaudeCodeClient(projectRoot?: string): ClaudeCodeClient {
  return new ClaudeCodeClient(projectRoot);
}

/**
 * Quick completion helper
 */
export async function completeWithClaudeCode(
  prompt: string,
  systemPrompt?: string,
  projectRoot?: string
): Promise<ClaudeCodeResponse> {
  const client = createClaudeCodeClient(projectRoot);
  return await client.complete(prompt, systemPrompt);
}
