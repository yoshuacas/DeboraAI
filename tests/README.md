# Testing Infrastructure

This directory contains the automated testing infrastructure for DeboraAI.

## Overview

The testing infrastructure is critical for preventing broken code from being deployed. It consists of three layers:

1. **Unit Tests** - Test individual functions and components in isolation
2. **Integration Tests** - Test interactions between multiple components and API endpoints
3. **E2E Tests** - Test complete user flows in a browser environment

## Directory Structure

```
tests/
├── unit/              # Unit tests (Jest)
├── integration/       # Integration tests (Jest)
└── e2e/              # End-to-end tests (Playwright)
```

## Running Tests

### Run all unit tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run E2E tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npm test -- tests/unit/example.test.ts
```

## Test Runner Service

The Test Runner service (`src/lib/code-modification/test-runner.ts`) is the core component that orchestrates all tests.

### Usage in Code

```typescript
import { runTests, validateTests } from '@/lib/code-modification/test-runner';

// Run tests and get detailed results
const result = await runTests({
  runUnit: true,
  runIntegration: true,
  runE2E: false,
  collectCoverage: true,
  coverageThreshold: 70,
});

if (!result.success) {
  console.error(`Tests failed: ${result.testsFailed}/${result.totalTests}`);
  // Block deployment
}

// Or use the convenience function that throws on failure
await validateTests(); // Throws error if tests fail
```

### Configuration Options

- `runUnit` - Run unit tests (default: true)
- `runIntegration` - Run integration tests (default: true)
- `runE2E` - Run E2E tests (default: false, slower)
- `collectCoverage` - Collect code coverage (default: true)
- `coverageThreshold` - Minimum coverage percentage (default: 70%)
- `timeout` - Test timeout in milliseconds (default: 120000)

## Coverage Requirements

All code changes must meet the following coverage thresholds:

- **Lines:** 70%
- **Statements:** 70%
- **Functions:** 70%
- **Branches:** 70%

Deployments will be blocked if coverage falls below these thresholds.

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/my-feature.test.ts
import { myFunction } from '@/lib/my-feature';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Test Example

```typescript
// tests/integration/api.test.ts
describe('API /api/my-endpoint', () => {
  it('should return 200 with valid data', async () => {
    const response = await fetch('/api/my-endpoint');
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('result');
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/user-flow.test.ts
import { test, expect } from '@playwright/test';

test('user can complete flow', async ({ page }) => {
  await page.goto('/');
  await page.click('button[data-testid="start"]');
  await expect(page.locator('.result')).toBeVisible();
});
```

## Continuous Integration

Tests run automatically before any deployment:

1. **Before staging deployment:** All unit + integration tests
2. **Before production promotion:** Full test suite including E2E

If any tests fail, the deployment is blocked.

## Troubleshooting

### Tests failing locally but passing in CI
- Check Node.js version (v20+ recommended)
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear test cache: `npm test -- --clearCache`

### Coverage not being collected
- Ensure jest.config.js has correct collectCoverageFrom patterns
- Check that files are not ignored by .gitignore

### E2E tests timing out
- Increase timeout in playwright.config.ts
- Check that dev server is running on correct port
- Verify network connectivity

## Status

✅ **Phase 3 Complete** - Testing infrastructure fully operational

- Jest configured with TypeScript support
- Playwright configured for E2E tests
- Test Runner service implemented
- Example tests created and passing
- Coverage thresholds enforced at 70%
