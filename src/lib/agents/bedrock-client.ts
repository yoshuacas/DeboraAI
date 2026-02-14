import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';

/**
 * Bedrock message format
 */
export interface BedrockMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Bedrock request options
 */
export interface BedrockRequestOptions {
  messages: BedrockMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * Bedrock response
 */
export interface BedrockResponse {
  success: boolean;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  stopReason?: string;
  error?: string;
}

/**
 * BedrockClient
 *
 * AWS Bedrock client for Claude Sonnet 4.5 integration.
 *
 * Configuration via environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION (default: us-east-1)
 *
 * Usage:
 * ```typescript
 * const client = new BedrockClient();
 * const response = await client.invokeModel({
 *   messages: [{ role: 'user', content: 'Hello!' }],
 *   system: 'You are a helpful assistant'
 * });
 * ```
 */
export class BedrockClient {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(
    region?: string,
    modelId: string = 'us.anthropic.claude-3-5-sonnet-20241022-v2:0'
  ) {
    const awsRegion = region || process.env.AWS_REGION || 'us-east-1';

    // Validate AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn(
        'AWS credentials not found in environment variables. ' +
        'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.'
      );
    }

    this.client = new BedrockRuntimeClient({
      region: awsRegion,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    this.modelId = modelId;
  }

  /**
   * Invoke Claude Sonnet model
   */
  async invokeModel(options: BedrockRequestOptions): Promise<BedrockResponse> {
    try {
      // Validate messages
      if (!options.messages || options.messages.length === 0) {
        return {
          success: false,
          content: '',
          error: 'No messages provided',
        };
      }

      // Build request payload for Claude
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: options.maxTokens || 4096,
        messages: options.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        ...(options.system && { system: options.system }),
        ...(options.temperature !== undefined && { temperature: options.temperature }),
        ...(options.topP !== undefined && { top_p: options.topP }),
        ...(options.stopSequences && { stop_sequences: options.stopSequences }),
      };

      // Prepare command
      const input: InvokeModelCommandInput = {
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      };

      const command = new InvokeModelCommand(input);

      // Invoke model
      const response = await this.client.send(command);

      // Parse response
      if (!response.body) {
        return {
          success: false,
          content: '',
          error: 'No response body from Bedrock',
        };
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract content from Claude response format
      const content = responseBody.content?.[0]?.text || '';
      const usage = responseBody.usage
        ? {
            inputTokens: responseBody.usage.input_tokens,
            outputTokens: responseBody.usage.output_tokens,
          }
        : undefined;

      return {
        success: true,
        content,
        usage,
        stopReason: responseBody.stop_reason,
      };
    } catch (error: any) {
      console.error('Bedrock API error:', error);

      return {
        success: false,
        content: '',
        error: error.message || 'Unknown Bedrock API error',
      };
    }
  }

  /**
   * Simple text completion
   */
  async complete(prompt: string, systemPrompt?: string): Promise<BedrockResponse> {
    return this.invokeModel({
      messages: [{ role: 'user', content: prompt }],
      ...(systemPrompt && { system: systemPrompt }),
    });
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: BedrockMessage[],
    systemPrompt?: string
  ): Promise<BedrockResponse> {
    return this.invokeModel({
      messages,
      ...(systemPrompt && { system: systemPrompt }),
    });
  }

  /**
   * Get model ID
   */
  getModelId(): string {
    return this.modelId;
  }

  /**
   * Test connection to Bedrock
   */
  async testConnection(): Promise<{
    success: boolean;
    modelId: string;
    error?: string;
  }> {
    try {
      const response = await this.complete('Hello! Please respond with just "OK".');

      return {
        success: response.success,
        modelId: this.modelId,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        modelId: this.modelId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Convenience function to create a Bedrock client
 */
export function createBedrockClient(
  region?: string,
  modelId?: string
): BedrockClient {
  return new BedrockClient(region, modelId);
}

/**
 * Quick completion helper
 */
export async function completeWithBedrock(
  prompt: string,
  systemPrompt?: string
): Promise<BedrockResponse> {
  const client = createBedrockClient();
  return await client.complete(prompt, systemPrompt);
}
