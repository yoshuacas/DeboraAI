/**
 * Tests for CodingAgent
 */

import { CodingAgent, createCodingAgent } from '@/lib/agents/coding-agent';

describe('CodingAgent', () => {
  let agent: CodingAgent;

  beforeEach(() => {
    agent = new CodingAgent(process.cwd());
  });

  describe('constructor', () => {
    it('should create CodingAgent instance', () => {
      expect(agent).toBeInstanceOf(CodingAgent);
    });
  });

  describe('initialize', () => {
    it('should load codebase context', async () => {
      await agent.initialize();

      const context = agent.getContext();
      expect(context).not.toBeNull();
      expect(context?.projectRoot).toBe(process.cwd());
    }, 30000);
  });

  describe('getContext', () => {
    it('should return null before initialization', () => {
      const context = agent.getContext();
      expect(context).toBeNull();
    });

    it('should return context after initialization', async () => {
      await agent.initialize();
      const context = agent.getContext();

      expect(context).not.toBeNull();
      expect(context?.structure).toBeDefined();
      expect(context?.dependencies).toBeDefined();
    }, 30000);
  });

  describe('reloadContext', () => {
    it('should reload codebase context', async () => {
      await agent.initialize();
      await agent.reloadContext();

      const context = agent.getContext();
      expect(context).not.toBeNull();
    }, 30000);
  });

  describe('createCodingAgent', () => {
    it('should create a CodingAgent instance', () => {
      const ca = createCodingAgent();
      expect(ca).toBeInstanceOf(CodingAgent);
    });

    it('should accept custom project root', () => {
      const ca = createCodingAgent(process.cwd());
      expect(ca).toBeInstanceOf(CodingAgent);
    });
  });

  // Real code generation tests are skipped to avoid API costs
  describe.skip('generateCode (integration)', () => {
    it('should generate code from user request', async () => {
      await agent.initialize();

      const response = await agent.generateCode({
        userRequest: 'Add a hello world function',
      });

      expect(response.success).toBe(true);
      expect(response.modifications).toBeDefined();
      expect(Array.isArray(response.modifications)).toBe(true);
    });
  });

  describe.skip('test (integration)', () => {
    it('should test agent functionality', async () => {
      const result = await agent.test();

      expect(result).toHaveProperty('success');
      if (!result.success) {
        console.log('Test error:', result.error);
      }
    });
  });
});
