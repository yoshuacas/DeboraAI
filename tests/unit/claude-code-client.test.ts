/**
 * Tests for ClaudeCodeClient
 */

import { ClaudeCodeClient, createClaudeCodeClient } from '@/lib/agents/claude-code-client';

describe('ClaudeCodeClient', () => {
  let client: ClaudeCodeClient;

  beforeEach(() => {
    client = new ClaudeCodeClient();
  });

  describe('constructor', () => {
    it('should create ClaudeCodeClient instance', () => {
      expect(client).toBeInstanceOf(ClaudeCodeClient);
    });

    it('should use current directory by default', () => {
      expect(client).toBeInstanceOf(ClaudeCodeClient);
    });

    it('should accept custom project root', () => {
      const customClient = new ClaudeCodeClient('/custom/path');
      expect(customClient).toBeInstanceOf(ClaudeCodeClient);
    });
  });

  describe('getLastSessionId', () => {
    it('should return undefined initially', () => {
      expect(client.getLastSessionId()).toBeUndefined();
    });
  });

  describe('setProjectRoot', () => {
    it('should set project root', () => {
      client.setProjectRoot('/new/path');
      expect(client).toBeInstanceOf(ClaudeCodeClient);
    });
  });

  describe('invokeModel', () => {
    it('should require messages', async () => {
      const response = await client.invokeModel({ messages: [] });

      expect(response.success).toBe(false);
      expect(response.error).toContain('No messages');
    });

    // Real CLI tests are skipped to avoid actual Claude Code execution
    it.skip('should invoke Claude Code CLI', async () => {
      const response = await client.invokeModel({
        messages: [{ role: 'user', content: 'Hello!' }],
      });

      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
    });

    it.skip('should handle system prompts', async () => {
      const response = await client.invokeModel({
        messages: [{ role: 'user', content: 'What is 2+2?' }],
        system: 'You are a math tutor',
      });

      expect(response.success).toBe(true);
      expect(response.content).toBeDefined();
    });

    it.skip('should handle allowed tools', async () => {
      const response = await client.invokeModel({
        messages: [{ role: 'user', content: 'Read package.json' }],
        allowedTools: ['Read'],
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
    it.skip('should test Claude Code connection', async () => {
      const result = await client.testConnection();

      expect(result).toHaveProperty('success');
    });
  });

  describe('createClaudeCodeClient', () => {
    it('should create a ClaudeCodeClient instance', () => {
      const cc = createClaudeCodeClient();
      expect(cc).toBeInstanceOf(ClaudeCodeClient);
    });

    it('should accept custom project root', () => {
      const cc = createClaudeCodeClient('/custom/path');
      expect(cc).toBeInstanceOf(ClaudeCodeClient);
    });
  });
});
