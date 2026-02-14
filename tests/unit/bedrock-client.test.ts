/**
 * Tests for BedrockClient
 */

import { BedrockClient, createBedrockClient } from '@/lib/agents/bedrock-client';

describe('BedrockClient', () => {
  let client: BedrockClient;

  beforeEach(() => {
    client = new BedrockClient();
  });

  describe('constructor', () => {
    it('should create BedrockClient instance', () => {
      expect(client).toBeInstanceOf(BedrockClient);
    });

    it('should use default model ID', () => {
      expect(client.getModelId()).toContain('sonnet');
    });

    it('should accept custom region', () => {
      const customClient = new BedrockClient('us-west-2');
      expect(customClient).toBeInstanceOf(BedrockClient);
    });

    it('should accept custom model ID', () => {
      const customClient = new BedrockClient(undefined, 'custom-model-id');
      expect(customClient.getModelId()).toBe('custom-model-id');
    });
  });

  describe('getModelId', () => {
    it('should return model ID', () => {
      const modelId = client.getModelId();
      expect(typeof modelId).toBe('string');
      expect(modelId.length).toBeGreaterThan(0);
    });
  });

  describe('invokeModel', () => {
    it('should require messages', async () => {
      const response = await client.invokeModel({ messages: [] });

      expect(response.success).toBe(false);
      expect(response.error).toContain('No messages');
    });

    // Real API tests are skipped to avoid costs
    it.skip('should invoke Claude model', async () => {
      const response = await client.invokeModel({
        messages: [{ role: 'user', content: 'Hello!' }],
      });

      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
    });
  });

  describe('complete', () => {
    it.skip('should complete text', async () => {
      const response = await client.complete('Hello!');

      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
    });
  });

  describe('chat', () => {
    it.skip('should chat with history', async () => {
      const response = await client.chat([
        { role: 'user', content: 'Hello!' },
      ]);

      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it.skip('should test Bedrock connection', async () => {
      const result = await client.testConnection();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('modelId');
    });
  });

  describe('createBedrockClient', () => {
    it('should create a BedrockClient instance', () => {
      const bc = createBedrockClient();
      expect(bc).toBeInstanceOf(BedrockClient);
    });

    it('should accept custom parameters', () => {
      const bc = createBedrockClient('us-west-2', 'custom-model');
      expect(bc).toBeInstanceOf(BedrockClient);
      expect(bc.getModelId()).toBe('custom-model');
    });
  });
});
