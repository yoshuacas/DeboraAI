import { test, expect } from '@playwright/test';

/**
 * E2E tests for admin promotion workflow
 * Tests staging to production promotion
 */

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@deboraai.local');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin Promotion Interface', () => {
  test('should display promotion page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Check for page title
    await expect(page.locator('h1:has-text("Promote to Production")')).toBeVisible();
  });

  test('should load and display diff data', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for data to load
    await page.waitForSelector('text=/Safety Checks|Changes to Promote/i', {
      timeout: 10000,
    });

    // Should show safety checks section
    await expect(page.locator('h2:has-text("Safety Checks")')).toBeVisible();

    // Should show changes section (if there are changes)
    await expect(page.locator('h2:has-text("Changes to Promote")')).toBeVisible();
  });

  test('should display safety check results', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for safety checks to complete
    await page.waitForSelector('text=/Safety Checks/i', { timeout: 10000 });

    // Should show either pass or fail
    const hasPassIcon = await page.locator('text=/All checks passed|ready to promote/i').isVisible();
    const hasFailIcon = await page
      .locator('text=/Safety checks failed|failed/i')
      .isVisible();

    expect(hasPassIcon || hasFailIcon).toBe(true);
  });

  test('should show commit information when changes exist', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // If there are changes, should show commits
    const hasChanges = await page
      .locator('text=/No changes to promote|already in sync/i')
      .isVisible();

    if (!hasChanges) {
      // Should show commit count, files changed, lines changed
      await expect(page.locator('text=/Commits|Files Changed|Lines Changed/i')).toBeVisible();
    }
  });

  test('should show "no changes" message when staging equals production', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check if there are no changes
    const noChangesVisible = await page
      .locator('text=/No changes to promote|already in sync/i')
      .isVisible();

    if (noChangesVisible) {
      // Promote button should be disabled
      const promoteButton = page.locator('button:has-text("Promote to Production")');
      await expect(promoteButton).toBeDisabled();
    }
  });

  test('should disable promote button when safety checks fail', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for safety checks
    await page.waitForTimeout(3000);

    const safetyFailed = await page.locator('text=/Safety checks failed/i').isVisible();

    if (safetyFailed) {
      const promoteButton = page.locator('button:has-text("Promote to Production")');
      await expect(promoteButton).toBeDisabled();
    }
  });

  test('should show confirmation dialog before promotion', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check if promote button is enabled
    const promoteButton = page.locator('button:has-text("Promote to Production")');
    const isEnabled = await promoteButton.isEnabled();

    if (isEnabled) {
      // Click promote button
      await promoteButton.click();

      // Should show confirmation dialog
      await expect(page.locator('text=/Confirm Promotion|Are you sure/i')).toBeVisible();
      await expect(page.locator('button:has-text("Yes, Promote Now")')).toBeVisible();
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    }
  });

  test('should cancel promotion when clicking cancel', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    await page.waitForTimeout(3000);

    const promoteButton = page.locator('button:has-text("Promote to Production")');
    const isEnabled = await promoteButton.isEnabled();

    if (isEnabled) {
      await promoteButton.click();
      await page.waitForSelector('button:has-text("Cancel")');
      await page.click('button:has-text("Cancel")');

      // Should hide confirmation and return to normal view
      await expect(page.locator('button:has-text("Yes, Promote Now")')).not.toBeVisible();
      await expect(promoteButton).toBeVisible();
    }
  });

  test('should execute promotion when confirmed', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    await page.waitForTimeout(3000);

    const promoteButton = page.locator('button:has-text("Promote to Production")');
    const isEnabled = await promoteButton.isEnabled();

    if (isEnabled) {
      // Click promote
      await promoteButton.click();

      // Click confirm
      await page.waitForSelector('button:has-text("Yes, Promote Now")');
      await page.click('button:has-text("Yes, Promote Now")');

      // Should show progress or success message
      await page.waitForSelector('text=/Promoting|Successfully promoted|success/i', {
        timeout: 60000,
      });
    }
  });

  test('should display promotion history', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Should show history section
    await expect(page.locator('h2:has-text("Recent Promotions")')).toBeVisible();

    // Should show either "No promotions yet" or promotion items
    const hasHistory = await page.locator('text=/No promotions yet/i').isVisible();
    const hasPromotionItems = await page.locator('.border-l-4.border-green-500').isVisible();

    expect(hasHistory || hasPromotionItems).toBe(true);
  });

  test('should show detailed file changes', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    await page.waitForTimeout(3000);

    // Check if there are changes to promote
    const hasChanges = !(await page
      .locator('text=/No changes to promote|already in sync/i')
      .isVisible());

    if (hasChanges) {
      // Should show files changed section
      await expect(page.locator('h3:has-text("Files Changed")')).toBeVisible();

      // Should show file paths with +/- indicators
      const filesList = page.locator('.font-mono').first();
      await expect(filesList).toBeVisible();
    }
  });

  test('should reload data after successful promotion', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    await page.waitForTimeout(3000);

    const promoteButton = page.locator('button:has-text("Promote to Production")');
    const isEnabled = await promoteButton.isEnabled();

    if (isEnabled) {
      const initialCommitCount = await page
        .locator('h3:has-text("Commits")')
        .count();

      // Execute promotion
      await promoteButton.click();
      await page.click('button:has-text("Yes, Promote Now")');
      await page.waitForSelector('text=/Successfully promoted/i', { timeout: 60000 });

      // Wait for reload
      await page.waitForTimeout(2000);

      // Should show "no changes" after promotion
      await expect(page.locator('text=/No changes to promote|already in sync/i')).toBeVisible({
        timeout: 10000,
      });
    }
  });
});

test.describe('Promotion API Endpoints', () => {
  test('should fetch diff data', async ({ page }) => {
    await login(page);

    // Navigate to trigger API call
    await page.goto('/admin/promote');

    // Wait for API response
    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/api/promotion/diff'),
      { timeout: 10000 }
    );

    expect(response.status()).toBe(200);
  });

  test('should fetch safety check data', async ({ page }) => {
    await login(page);

    await page.goto('/admin/promote');

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/api/promotion/check'),
      { timeout: 10000 }
    );

    expect(response.status()).toBe(200);
  });

  test('should fetch promotion history', async ({ page }) => {
    await login(page);

    await page.goto('/admin/promote');

    const response = await page.waitForResponse(
      (resp) => resp.url().includes('/api/promotion/history'),
      { timeout: 10000 }
    );

    expect(response.status()).toBe(200);
  });
});
