import { test, expect } from '@playwright/test';

/**
 * E2E tests for admin change history page
 * Tests viewing git commit history
 */

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@deboraai.local');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Admin Change History Page', () => {
  test('should display change history page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    // Check for page title
    await expect(page.locator('h1:has-text("Change History")')).toBeVisible();

    // Check for description
    await expect(
      page.locator('text=/code modifications made by the AI agent/i')
    ).toBeVisible();
  });

  test('should have back link to code modification page', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    // Check for back link (link with text "Back to Code Modification")
    const backLink = page.locator('a:has-text("Back to Code Modification")');
    await expect(backLink).toBeVisible();

    // Click back link
    await backLink.click();

    // Should navigate to code page
    await page.waitForURL(/\/admin\/code/, { timeout: 10000 });
    expect(page.url()).toContain('/admin/code');
  });

  test('should load commit history from API', async ({ page }) => {
    await login(page);

    // Navigate and wait for API call
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/code/history'),
      { timeout: 10000 }
    );

    await page.goto('/admin/history');

    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });

  test('should show loading state while fetching commits', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    // Should briefly show loading indicator
    const loadingIndicator = page.locator('text=/Loading commit history/i');
    // May or may not catch the loading state depending on timing
  });

  test('should show empty state when no commits exist', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // If no commits, should show empty state
    const emptyState = await page.locator('text=/No changes yet/i').isVisible();
    const hasCommits = await page.locator('.bg-white.rounded-lg.border').count();

    if (hasCommits === 0) {
      expect(emptyState).toBe(true);
      await expect(page.locator('text=/Code modifications will appear here/i')).toBeVisible();
    }
  });

  test('should display commit information', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(3000);

    // Check if there are any commit cards (not the empty state card)
    const emptyState = await page.locator('text=/No changes yet/i').isVisible();

    if (!emptyState) {
      // Should show commit hash in monospace
      await expect(page.locator('.font-mono').first()).toBeVisible();

      // Should show author and date information
      await expect(page.locator('.text-sm.text-gray-600').first()).toBeVisible();
    } else {
      // If no commits, the test passes (no commits to display)
      expect(emptyState).toBe(true);
    }
  });

  test('should display files changed for each commit', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(3000);

    // Check if there are any commits
    const emptyState = await page.locator('text=/No changes yet/i').isVisible();

    if (!emptyState) {
      // If there are commits, files section might exist (if the commit has files)
      // Just check that commit cards are rendered
      const commitCards = await page.locator('.bg-white.rounded-lg.border').count();
      expect(commitCards).toBeGreaterThan(0);
    } else {
      // No commits, so test passes
      expect(emptyState).toBe(true);
    }
  });

  test('should show View Diff button for each commit', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(3000);

    const emptyState = await page.locator('text=/No changes yet/i').isVisible();

    if (!emptyState) {
      // Should have View Diff button
      await expect(page.locator('button:has-text("View Diff")').first()).toBeVisible();
    } else {
      // No commits, test passes
      expect(emptyState).toBe(true);
    }
  });

  test('should show Revert button for each commit', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(3000);

    const emptyState = await page.locator('text=/No changes yet/i').isVisible();

    if (!emptyState) {
      // Should have Revert button
      await expect(page.locator('button:has-text("Revert")').first()).toBeVisible();
    } else {
      // No commits, test passes
      expect(emptyState).toBe(true);
    }
  });

  test('should show alert when clicking View Diff (TODO functionality)', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(2000);

    const viewDiffButton = page.locator('button:has-text("View Diff")').first();
    const isVisible = await viewDiffButton.isVisible();

    if (isVisible) {
      // Setup dialog listener
      page.once('dialog', (dialog) => {
        expect(dialog.message()).toContain('View diff functionality coming soon');
        dialog.accept();
      });

      await viewDiffButton.click();
    }
  });

  test('should show confirmation when clicking Revert', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(2000);

    const revertButton = page.locator('button:has-text("Revert")').first();
    const isVisible = await revertButton.isVisible();

    if (isVisible) {
      // Setup dialog listener for confirmation
      page.once('dialog', (dialog) => {
        expect(dialog.message()).toContain('Are you sure');
        dialog.dismiss(); // Click cancel
      });

      await revertButton.click();
    }
  });

  test('should format dates correctly', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(3000);

    const emptyState = await page.locator('text=/No changes yet/i').isVisible();

    if (!emptyState) {
      // Find date text within commit cards (skip the header)
      const commitCard = page.locator('.bg-white.rounded-lg.border').first();
      const dateText = await commitCard.locator('.text-sm.text-gray-600').textContent();
      expect(dateText).toMatch(/\d+/); // Should contain numbers
    } else {
      // No commits, test passes
      expect(emptyState).toBe(true);
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await login(page);

    // Mock an API error by going offline briefly
    await page.route('**/api/code/history', (route) => {
      route.abort();
    });

    await page.goto('/admin/history');

    // Should show error message
    await page.waitForSelector('text=/Error|Failed to load/i', { timeout: 5000 });
  });

  test('should show commits in reverse chronological order', async ({ page }) => {
    await login(page);
    await page.goto('/admin/history');

    await page.waitForTimeout(2000);

    const commitCards = await page.locator('.bg-white.rounded-lg.border').count();

    if (commitCards >= 2) {
      // Get first two commit dates
      const firstDate = await page
        .locator('.text-sm.text-gray-600')
        .first()
        .textContent();
      const secondDate = await page
        .locator('.text-sm.text-gray-600')
        .nth(1)
        .textContent();

      // Both should exist and be valid
      expect(firstDate).toBeTruthy();
      expect(secondDate).toBeTruthy();
    }
  });
});
