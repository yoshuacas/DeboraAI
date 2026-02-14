import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Test result structure
 */
export interface TestResult {
  success: boolean;
  testsPassed: number;
  testsFailed: number;
  totalTests: number;
  coverage?: CoverageResult;
  output: string;
  errors?: string;
  duration: number;
}

/**
 * Coverage result structure
 */
export interface CoverageResult {
  lines: number;
  statements: number;
  functions: number;
  branches: number;
  meetsThreshold: boolean;
}

/**
 * Test runner configuration
 */
export interface TestRunnerConfig {
  projectRoot?: string;
  runUnit?: boolean;
  runIntegration?: boolean;
  runE2E?: boolean;
  collectCoverage?: boolean;
  coverageThreshold?: number;
  timeout?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TestRunnerConfig = {
  projectRoot: process.cwd(),
  runUnit: true,
  runIntegration: true,
  runE2E: false, // E2E tests are slower, skip by default
  collectCoverage: true,
  coverageThreshold: 70,
  timeout: 120000, // 2 minutes
};

/**
 * Test Runner Service
 *
 * This is a CRITICAL service that runs automated tests before deploying code changes.
 * It prevents broken code from being deployed to staging or production.
 *
 * Usage:
 * ```typescript
 * const result = await runTests();
 * if (!result.success) {
 *   throw new Error('Tests failed - blocking deployment');
 * }
 * ```
 */
export class TestRunner {
  private config: TestRunnerConfig;
  private projectRoot: string;

  constructor(config: Partial<TestRunnerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.projectRoot = this.config.projectRoot || process.cwd();
  }

  /**
   * Run all configured tests
   */
  async runAll(): Promise<TestResult> {
    const startTime = Date.now();
    let totalPassed = 0;
    let totalFailed = 0;
    let allOutput = '';
    let allErrors = '';
    let overallSuccess = true;
    let coverage: CoverageResult | undefined;

    try {
      // Run unit tests
      if (this.config.runUnit) {
        console.log('Running unit tests...');
        const unitResult = await this.runUnitTests();
        totalPassed += unitResult.testsPassed;
        totalFailed += unitResult.testsFailed;
        allOutput += `\n=== UNIT TESTS ===\n${unitResult.output}`;
        if (!unitResult.success) {
          overallSuccess = false;
          allErrors += unitResult.errors || '';
        }
        if (unitResult.coverage) {
          coverage = unitResult.coverage;
        }
      }

      // Run integration tests
      if (this.config.runIntegration) {
        console.log('Running integration tests...');
        const integrationResult = await this.runIntegrationTests();
        totalPassed += integrationResult.testsPassed;
        totalFailed += integrationResult.testsFailed;
        allOutput += `\n=== INTEGRATION TESTS ===\n${integrationResult.output}`;
        if (!integrationResult.success) {
          overallSuccess = false;
          allErrors += integrationResult.errors || '';
        }
      }

      // Run E2E tests (optional, slower)
      if (this.config.runE2E) {
        console.log('Running E2E tests...');
        const e2eResult = await this.runE2ETests();
        totalPassed += e2eResult.testsPassed;
        totalFailed += e2eResult.testsFailed;
        allOutput += `\n=== E2E TESTS ===\n${e2eResult.output}`;
        if (!e2eResult.success) {
          overallSuccess = false;
          allErrors += e2eResult.errors || '';
        }
      }

      // Check coverage threshold
      if (coverage && this.config.coverageThreshold) {
        if (!coverage.meetsThreshold) {
          overallSuccess = false;
          allErrors += `\nCoverage below threshold: ${this.config.coverageThreshold}%`;
        }
      }

    } catch (error) {
      overallSuccess = false;
      allErrors += `\nUnexpected error: ${error instanceof Error ? error.message : String(error)}`;
    }

    const duration = Date.now() - startTime;

    return {
      success: overallSuccess,
      testsPassed: totalPassed,
      testsFailed: totalFailed,
      totalTests: totalPassed + totalFailed,
      coverage,
      output: allOutput,
      errors: allErrors || undefined,
      duration,
    };
  }

  /**
   * Run unit tests with Jest
   */
  async runUnitTests(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const outputFile = path.join(this.projectRoot, 'test-results-unit.json');
      const command = this.config.collectCoverage
        ? 'npm test -- tests/unit --coverage --coverageDirectory=coverage/unit --json --outputFile=test-results-unit.json'
        : 'npm test -- tests/unit --json --outputFile=test-results-unit.json';

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.timeout,
      });

      // Read Jest JSON output from file (Jest writes to file, not stdout)
      const result = await this.parseJestOutputFromFile(outputFile, stdout, stderr);
      result.duration = Date.now() - startTime;

      // Parse coverage if collected
      if (this.config.collectCoverage) {
        result.coverage = await this.parseCoverage();
      }

      return result;
    } catch (error: any) {
      // Jest exits with non-zero code when tests fail
      const outputFile = path.join(this.projectRoot, 'test-results-unit.json');
      const result = await this.parseJestOutputFromFile(outputFile, error.stdout || '', error.stderr || '');
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Run integration tests with Jest
   */
  async runIntegrationTests(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const outputFile = path.join(this.projectRoot, 'test-results-integration.json');
      const command = 'npm test -- tests/integration --json --outputFile=test-results-integration.json';

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.timeout,
      });

      const result = await this.parseJestOutputFromFile(outputFile, stdout, stderr);
      result.duration = Date.now() - startTime;
      return result;
    } catch (error: any) {
      const outputFile = path.join(this.projectRoot, 'test-results-integration.json');
      const result = await this.parseJestOutputFromFile(outputFile, error.stdout || '', error.stderr || '');
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Run E2E tests with Playwright
   */
  async runE2ETests(): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const command = 'npm run test:e2e -- --reporter=json';

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.config.timeout,
      });

      const result = this.parsePlaywrightOutput(stdout, stderr);
      result.duration = Date.now() - startTime;
      return result;
    } catch (error: any) {
      const result = this.parsePlaywrightOutput(error.stdout || '', error.stderr || '');
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Parse Jest output from JSON file
   */
  private async parseJestOutputFromFile(outputFile: string, stdout: string, stderr: string): Promise<TestResult> {
    try {
      // Read JSON from file
      const fileContent = await fs.promises.readFile(outputFile, 'utf-8');
      const data = JSON.parse(fileContent);

      return {
        success: data.success || false,
        testsPassed: data.numPassedTests || 0,
        testsFailed: data.numFailedTests || 0,
        totalTests: data.numTotalTests || 0,
        output: stdout,
        errors: data.success ? undefined : stderr,
        duration: 0, // Will be set by caller
      };
    } catch (e) {
      // Fallback to parsing stdout if file read fails
      console.warn('Failed to read test results file, falling back to stdout parsing:', e);
      return this.parseJestOutput(stdout, stderr);
    }
  }

  /**
   * Parse Jest output
   */
  private parseJestOutput(stdout: string, stderr: string): TestResult {
    try {
      // Try to parse JSON output
      const lines = stdout.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{'));

      if (jsonLine) {
        const data = JSON.parse(jsonLine);

        return {
          success: data.success || false,
          testsPassed: data.numPassedTests || 0,
          testsFailed: data.numFailedTests || 0,
          totalTests: data.numTotalTests || 0,
          output: stdout,
          errors: data.success ? undefined : stderr,
          duration: 0, // Will be set by caller
        };
      }
    } catch (e) {
      // Fallback to manual parsing if JSON parsing fails
    }

    // Fallback: parse text output
    const passedMatch = stdout.match(/(\d+) passed/);
    const failedMatch = stdout.match(/(\d+) failed/);
    const totalMatch = stdout.match(/(\d+) total/);

    const passed = passedMatch ? parseInt(passedMatch[1]) : 0;
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0;
    const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed;

    return {
      success: failed === 0 && total > 0,
      testsPassed: passed,
      testsFailed: failed,
      totalTests: total,
      output: stdout,
      errors: failed > 0 ? stderr : undefined,
      duration: 0,
    };
  }

  /**
   * Parse Playwright output
   */
  private parsePlaywrightOutput(stdout: string, stderr: string): TestResult {
    try {
      // Playwright JSON format
      const data = JSON.parse(stdout);

      const passed = data.suites?.reduce((sum: number, suite: any) => {
        return sum + (suite.specs?.filter((s: any) => s.ok).length || 0);
      }, 0) || 0;

      const failed = data.suites?.reduce((sum: number, suite: any) => {
        return sum + (suite.specs?.filter((s: any) => !s.ok).length || 0);
      }, 0) || 0;

      return {
        success: failed === 0 && passed > 0,
        testsPassed: passed,
        testsFailed: failed,
        totalTests: passed + failed,
        output: stdout,
        errors: failed > 0 ? stderr : undefined,
        duration: 0,
      };
    } catch (e) {
      // Fallback parsing
      return {
        success: !stderr.includes('failed') && stdout.includes('passed'),
        testsPassed: 0,
        testsFailed: 0,
        totalTests: 0,
        output: stdout,
        errors: stderr,
        duration: 0,
      };
    }
  }

  /**
   * Parse coverage data from Jest coverage report
   */
  private async parseCoverage(): Promise<CoverageResult | undefined> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      // Read coverage summary
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      const coverage = JSON.parse(coverageData);

      const total = coverage.total;

      const lines = total.lines?.pct || 0;
      const statements = total.statements?.pct || 0;
      const functions = total.functions?.pct || 0;
      const branches = total.branches?.pct || 0;

      const threshold = this.config.coverageThreshold || 70;
      const meetsThreshold =
        lines >= threshold &&
        statements >= threshold &&
        functions >= threshold &&
        branches >= threshold;

      return {
        lines,
        statements,
        functions,
        branches,
        meetsThreshold,
      };
    } catch (error) {
      console.warn('Could not parse coverage data:', error);
      return undefined;
    }
  }
}

/**
 * Convenience function to run all tests
 */
export async function runTests(config?: Partial<TestRunnerConfig>): Promise<TestResult> {
  const runner = new TestRunner(config);
  return await runner.runAll();
}

/**
 * Quick validation function - throws error if tests fail
 * Use this to block deployments
 */
export async function validateTests(config?: Partial<TestRunnerConfig>): Promise<void> {
  const result = await runTests(config);

  if (!result.success) {
    throw new Error(
      `Tests failed! ${result.testsFailed}/${result.totalTests} tests failed.\n` +
      `${result.errors || 'See output for details.'}`
    );
  }

  console.log(`✓ All tests passed! ${result.testsPassed}/${result.totalTests}`);

  if (result.coverage) {
    console.log(`Coverage: Lines ${result.coverage.lines}%, Statements ${result.coverage.statements}%, Functions ${result.coverage.functions}%, Branches ${result.coverage.branches}%`);
  }
}
