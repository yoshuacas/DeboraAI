import { BedrockClient, BedrockMessage } from './bedrock-client';
import { buildCodebaseContext, formatContextForAgent, CodebaseContext } from './codebase-context';
import { FileModification } from '../code-modification/file-manager';

/**
 * Code generation request
 */
export interface CodeGenerationRequest {
  userRequest: string;
  conversationHistory?: BedrockMessage[];
  focusedFiles?: string[];
  additionalContext?: string;
}

/**
 * Code generation response
 */
export interface CodeGenerationResponse {
  success: boolean;
  modifications: FileModification[];
  explanation: string;
  thinking?: string;
  error?: string;
  warnings?: string[];
}

/**
 * CodingAgent
 *
 * THE MOST CRITICAL COMPONENT.
 *
 * This AI agent:
 * - Understands the full codebase structure
 * - Generates code based on natural language requests
 * - Knows which files are protected and cannot be modified
 * - Creates multi-file changes (database → API → UI)
 * - Provides explanations for all changes
 *
 * Usage:
 * ```typescript
 * const agent = new CodingAgent('/path/to/project');
 * const response = await agent.generateCode({
 *   userRequest: 'Add a dark mode toggle'
 * });
 * ```
 */
export class CodingAgent {
  private bedrockClient: BedrockClient;
  private projectRoot: string;
  private codebaseContext: CodebaseContext | null = null;

  constructor(projectRoot: string, bedrockClient?: BedrockClient) {
    this.projectRoot = projectRoot;
    this.bedrockClient = bedrockClient || new BedrockClient();
  }

  /**
   * Initialize agent by building codebase context
   */
  async initialize(): Promise<void> {
    console.log('Initializing coding agent...');
    this.codebaseContext = await buildCodebaseContext(this.projectRoot);
    console.log('Codebase context loaded!');
  }

  /**
   * Generate code based on user request
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    try {
      // Ensure context is loaded
      if (!this.codebaseContext) {
        await this.initialize();
      }

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Build user prompt with context
      const userPrompt = this.buildUserPrompt(request);

      // Prepare messages
      const messages: BedrockMessage[] = [
        ...(request.conversationHistory || []),
        {
          role: 'user',
          content: userPrompt,
        },
      ];

      // Call Bedrock
      console.log('Calling Claude Sonnet 4.5...');
      const response = await this.bedrockClient.invokeModel({
        messages,
        system: systemPrompt,
        maxTokens: 8000,
        temperature: 0.3, // Lower temperature for more consistent code generation
      });

      if (!response.success) {
        return {
          success: false,
          modifications: [],
          explanation: '',
          error: response.error || 'Failed to generate code',
        };
      }

      // Parse agent response
      const parsed = this.parseAgentResponse(response.content);

      return parsed;
    } catch (error) {
      return {
        success: false,
        modifications: [],
        explanation: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Build system prompt for the coding agent
   */
  private buildSystemPrompt(): string {
    if (!this.codebaseContext) {
      throw new Error('Codebase context not initialized');
    }

    const contextStr = formatContextForAgent(this.codebaseContext);

    return `You are an expert coding agent that modifies a Next.js application based on user requests.

${contextStr}

## YOUR ROLE

You must generate code changes to implement user requests. You have access to the full codebase context above.

## CRITICAL RULES

1. **NEVER MODIFY PROTECTED FILES** - These files are essential and off-limits:
   - Authentication files (src/lib/auth.ts, src/middleware.ts, src/app/api/auth/**)
   - Your own code (src/lib/code-modification/**, src/lib/agents/**)
   - Configuration files (.env, package.json, tsconfig.json, next.config.ts, etc.)
   - Git files (.git/**, .gitignore)

2. **BE CAREFUL WITH SENSITIVE FILES** - These require extra validation:
   - Database schema (prisma/schema.prisma) - only modify if explicitly requested
   - Root layout (src/app/layout.tsx)
   - Core libraries (src/lib/**)

3. **GENERATE COMPLETE, VALID CODE** - All code must:
   - Be syntactically correct TypeScript/JavaScript
   - Include all necessary imports
   - Follow the existing codebase patterns
   - Be production-ready

4. **THINK THROUGH CHANGES** - For each request:
   - Identify which files need to be modified
   - Consider database schema changes
   - Think about API endpoints needed
   - Plan UI components required

## OUTPUT FORMAT

You MUST respond in this exact JSON format (ensure all strings are properly escaped):

\`\`\`json
{
  "thinking": "Your internal reasoning about how to implement this (keep on ONE line or properly escape newlines as \\n)",
  "modifications": [
    {
      "filePath": "src/app/example/page.tsx",
      "content": "// Complete file content here...",
      "createIfMissing": true
    }
  ],
  "explanation": "A clear explanation of what you changed and why (keep on ONE line or properly escape newlines as \\n)",
  "warnings": ["Optional warnings about the changes..."]
}
\`\`\`

IMPORTANT: All JSON strings must be on a single line OR use proper escape sequences (\\n for newlines, \\t for tabs).

## IMPORTANT NOTES

- For database changes: You can only modify prisma/schema.prisma if explicitly requested
- For new features: Create database model → API route → UI component (in that order)
- For bug fixes: Identify the issue → Fix the minimal code needed
- Always explain your changes clearly

Remember: Your changes will be automatically tested and deployed. Generate high-quality, working code!`;
  }

  /**
   * Build user prompt with context
   */
  private buildUserPrompt(request: CodeGenerationRequest): string {
    const lines: string[] = [];

    lines.push('## USER REQUEST\n');
    lines.push(request.userRequest);

    if (request.focusedFiles && request.focusedFiles.length > 0) {
      lines.push('\n## FOCUSED FILES\n');
      lines.push('The user is currently looking at these files:');
      request.focusedFiles.forEach((file) => lines.push(`- ${file}`));
    }

    if (request.additionalContext) {
      lines.push('\n## ADDITIONAL CONTEXT\n');
      lines.push(request.additionalContext);
    }

    lines.push('\n## YOUR TASK\n');
    lines.push('Generate the necessary code modifications to implement the user\'s request.');
    lines.push('Respond in the JSON format specified in the system prompt.');

    return lines.join('\n');
  }

  /**
   * Parse agent response into structured format
   */
  private parseAgentResponse(content: string): CodeGenerationResponse {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      let jsonStr = jsonMatch ? jsonMatch[1] : content;

      // Trim whitespace
      jsonStr = jsonStr.trim();

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Validate structure
      if (!parsed.modifications || !Array.isArray(parsed.modifications)) {
        return {
          success: false,
          modifications: [],
          explanation: '',
          error: 'Invalid response format: missing modifications array',
        };
      }

      // Validate each modification
      const modifications: FileModification[] = [];
      for (const mod of parsed.modifications) {
        if (!mod.filePath || !mod.content) {
          console.warn('Skipping invalid modification:', mod);
          continue;
        }

        modifications.push({
          filePath: mod.filePath,
          content: mod.content,
          createIfMissing: mod.createIfMissing ?? true,
        });
      }

      if (modifications.length === 0) {
        return {
          success: false,
          modifications: [],
          explanation: parsed.explanation || '',
          error: 'No valid modifications generated',
          warnings: parsed.warnings,
        };
      }

      return {
        success: true,
        modifications,
        explanation: parsed.explanation || 'Code generated successfully',
        thinking: parsed.thinking,
        warnings: parsed.warnings,
      };
    } catch (error) {
      console.error('Failed to parse agent response:', error);
      console.error('Raw content:', content);

      return {
        success: false,
        modifications: [],
        explanation: '',
        error: `Failed to parse agent response: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get codebase context
   */
  getContext(): CodebaseContext | null {
    return this.codebaseContext;
  }

  /**
   * Reload codebase context
   */
  async reloadContext(): Promise<void> {
    this.codebaseContext = await buildCodebaseContext(this.projectRoot);
  }

  /**
   * Test if agent is working
   */
  async test(): Promise<{ success: boolean; error?: string }> {
    try {
      const testResult = await this.bedrockClient.testConnection();

      if (!testResult.success) {
        return {
          success: false,
          error: testResult.error || 'Bedrock connection test failed',
        };
      }

      // Test context loading
      if (!this.codebaseContext) {
        await this.initialize();
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Convenience function to create a coding agent
 */
export function createCodingAgent(projectRoot?: string): CodingAgent {
  const root = projectRoot || process.cwd();
  return new CodingAgent(root);
}
