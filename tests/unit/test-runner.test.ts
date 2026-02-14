/**
 * Tests for the Test Runner service
 */

import { TestRunner } from '@/lib/code-modification/test-runner';

describe('TestRunner', () => {
  describe('constructor', () => {
    it('should initialize with default config', () => {
      const runner = new TestRunner();
      expect(runner).toBeDefined();
    });

    it('should accept custom config', () => {
      const runner = new TestRunner({
        runE2E: true,
        coverageThreshold: 80,
      });
      expect(runner).toBeDefined();
    });
  });

  describe('runUnitTests', () => {
    it('should have a runUnitTests method', () => {
      const runner = new TestRunner();
      expect(typeof runner.runUnitTests).toBe('function');
    });
  });

  describe('runIntegrationTests', () => {
    it('should have a runIntegrationTests method', () => {
      const runner = new TestRunner();
      expect(typeof runner.runIntegrationTests).toBe('function');
    });
  });

  describe('runE2ETests', () => {
    it('should have a runE2ETests method', () => {
      const runner = new TestRunner();
      expect(typeof runner.runE2ETests).toBe('function');
    });
  });

  describe('runAll', () => {
    it('should have a runAll method', () => {
      const runner = new TestRunner();
      expect(typeof runner.runAll).toBe('function');
    });

    // Integration test - commented out as it will run actual tests
    // it.skip('should run all tests successfully', async () => {
    //   const runner = new TestRunner({
    //     runE2E: false, // Skip E2E for faster testing
    //   });
    //   const result = await runner.runAll();
    //   expect(result).toHaveProperty('success');
    //   expect(result).toHaveProperty('testsPassed');
    //   expect(result).toHaveProperty('testsFailed');
    //   expect(result).toHaveProperty('totalTests');
    // }, 120000);
  });
});
