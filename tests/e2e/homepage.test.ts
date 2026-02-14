import { test, expect } from '@playwright/test';

/**
 * Example E2E test for the homepage
 * This validates the Playwright configuration
 */

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that the page has loaded
    expect(page.url()).toContain('localhost');
  });

  test('should have a title', async ({ page }) => {
    await page.goto('/');

    // Check for page title (adjust based on your actual title)
    await expect(page).toHaveTitle(/DeboraAI|Next\.js/);
  });

  test('should render main content', async ({ page }) => {
    await page.goto('/');

    // Check that the main element exists
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have working links', async ({ page }) => {
    await page.goto('/');

    // This is a placeholder - update with actual navigation tests
    // Example:
    // await page.click('a[href="/about"]');
    // await expect(page).toHaveURL(/.*about/);
  });
});
