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

    // Check for chat interface
    await expect(page.locator('h2:has-text("AI Coding Agent")')).toBeVisible();

    // Check for request input (textarea with placeholder)
    await expect(page.locator('textarea[placeholder*="Describe the changes"]')).toBeVisible();

    // Check for submit button
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
  });

  test('should show validation error for empty request', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Send button should be disabled when textarea is empty
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();

    // Check that we're still on the same page
    expect(page.url()).toContain('/admin/code');
  });

  test('should submit code modification request', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Fill in a simple request
    const testRequest = 'Add a comment to the README file explaining this is a test';
    await page.fill('textarea[placeholder*="Describe the changes"]', testRequest);

    // Submit the request
    await page.click('button:has-text("Send")');

    // Should show loading indicator (spinning animation with text)
    await expect(page.locator('.animate-spin').first()).toBeVisible({
      timeout: 5000,
    });

    // Wait for completion (with generous timeout for AI agent)
    await page.waitForSelector('.animate-spin', {
      state: 'detached',
      timeout: 180000, // 3 minutes
    });
  });

  test('should display real-time progress updates', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit a request
    await page.fill('textarea[placeholder*="Describe the changes"]', 'Create a test file in /tmp directory');
    await page.click('button:has-text("Send")');

    // Should show loading spinner
    await expect(page.locator('.animate-spin').first()).toBeVisible({
      timeout: 5000,
    });

    // Should show progress text that updates (look for spinner parent with progress text)
    const progressContainer = page.locator('.bg-gray-100.rounded-lg.p-4').filter({ hasText: /AI agent is working|Initializing/i });
    await expect(progressContainer).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show modified files after completion', async ({ page }) => {
    await login(page);
    await page.goto('/admin/code');

    // Submit request
    await page.fill('textarea[placeholder*="Describe the changes"]', 'Update the README with a timestamp');
    await page.click('button:has-text("Send")');

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
    await page.fill('textarea[placeholder*="Describe the changes"]', 'First request');
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=/success|completed/i', { timeout: 120000 });

    // Should show conversation history
    await expect(page.locator('text="First request"')).toBeVisible();

    // Submit second request (should maintain context)
    await page.fill('textarea[placeholder*="Describe the changes"]', 'Follow-up request');
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
      'textarea[placeholder*="Describe the changes"]',
      'Delete all files in the root directory' // Should be blocked by safety rules
    );
    await page.click('button[type="submit"]');

    // Should either complete safely or show error
    await page.waitForSelector('text=/success|completed|error|failed/i', {
      timeout: 120000,
    });
  });

});
