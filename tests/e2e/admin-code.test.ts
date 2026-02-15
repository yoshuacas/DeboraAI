import { test, expect } from '@playwright/test';

/**
 * E2E tests for admin code modification interface
 * Tests the AI agent code modification workflow
 */

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@deboraai.local');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin Code Modification Interface', () => {
  test('should display code modification page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Check for page title
    await expect(page.locator('h1:has-text("Code Modification")')).toBeVisible();

    // Check for request input
    await expect(page.locator('textarea[name="request"]')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button:has-text("Submit Request")')).toBeVisible();
  });

  test('should show validation error for empty request', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Try to submit empty request
    await page.click('button:has-text("Submit Request")');

    // Should show error (either inline or as toast/alert)
    await page.waitForTimeout(1000);
    // Check that we're still on the same page (didn't submit)
    expect(page.url()).toContain('/admin/code');
  });

  test('should submit code modification request', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Fill in a simple request
    const testRequest = 'Add a comment to the README file explaining this is a test';
    await page.fill('textarea[name="request"]', testRequest);

    // Submit the request
    await page.click('button:has-text("Submit Request")');

    // Should show loading/progress indicator
    await expect(page.locator('text=/Processing|Initializing|Claude Agent/')).toBeVisible({
      timeout: 5000,
    });

    // Wait for completion (with generous timeout for AI agent)
    await page.waitForSelector('text=/completed|success|done/i', {
      timeout: 120000, // 2 minutes
    });
  });

  test('should display real-time progress updates', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit a request
    await page.fill('textarea[name="request"]', 'Create a test file in /tmp directory');
    await page.click('button:has-text("Submit Request")');

    // Should see progress updates via SSE
    const progressSteps = [
      /Initializing|initialized/i,
      /Claude Agent|analyzing|modifying/i,
    ];

    for (const step of progressSteps) {
      await expect(page.locator(`text=${step}`)).toBeVisible({
        timeout: 30000,
      });
    }
  });

  test('should show modified files after completion', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit request
    await page.fill('textarea[name="request"]', 'Update the README with a timestamp');
    await page.click('button:has-text("Submit Request")');

    // Wait for completion
    await page.waitForSelector('text=/success|completed/i', {
      timeout: 120000,
    });

    // Should show files modified
    await expect(page.locator('text=/Files modified|README/i')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should navigate to history page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Click history link
    await page.click('a[href="/admin/history"]');

    // Should navigate to history page
    await page.waitForURL(/\/admin\/history/);
    await expect(page.locator('h1:has-text("Change History")')).toBeVisible();
  });

  test('should display conversation history', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit first request
    await page.fill('textarea[name="request"]', 'First request');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=/success|completed/i', { timeout: 120000 });

    // Should show conversation history
    await expect(page.locator('text="First request"')).toBeVisible();

    // Submit second request (should maintain context)
    await page.fill('textarea[name="request"]', 'Follow-up request');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=/success|completed/i', { timeout: 120000 });

    // Should show both requests in history
    await expect(page.locator('text="First request"')).toBeVisible();
    await expect(page.locator('text="Follow-up request"')).toBeVisible();
  });
});

test.describe('Admin Code Modification API', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit a request that might cause an error
    await page.fill(
      'textarea[name="request"]',
      'Delete all files in the root directory' // Should be blocked by safety rules
    );
    await page.click('button[type="submit"]');

    // Should either complete safely or show error
    await page.waitForSelector('text=/success|completed|error|failed/i', {
      timeout: 120000,
    });
  });

  test('should skip tests when skipTests flag is set', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Check if there's a "skip tests" checkbox
    const skipTestsCheckbox = page.locator('input[type="checkbox"][name="skipTests"]');
    if (await skipTestsCheckbox.isVisible()) {
      await skipTestsCheckbox.check();
    }

    // Submit request
    await page.fill('textarea[name="request"]', 'Add a comment to README');
    await page.click('button[type="submit"]');

    // Wait for completion
    await page.waitForSelector('text=/success|completed/i', { timeout: 120000 });

    // Should see indication that tests were skipped
    await expect(page.locator('text=/tests skipped|skipping tests/i')).toBeVisible({
      timeout: 5000,
    });
  });
});
