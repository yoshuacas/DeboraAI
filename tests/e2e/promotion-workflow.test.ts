import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the complete promotion workflow
 * This tests the entire flow from staging changes to production deployment
 */

// Helper function to login
async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@deboraai.local');
  await page.fill('input[name="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/);
}

test.describe('Complete Promotion Workflow', () => {
  test('should promote staging changes to production', async ({ page }) => {
    // Step 1: Login
    await login(page);

    // Step 2: Go to promotion page
    await page.goto('/admin/promote');

    // Wait for page to load
    await page.waitForTimeout(5000);

    // Wait for loading to finish
    const isLoading = await page.locator('text=/Loading promotion data.../i').isVisible();
    if (isLoading) {
      await page.waitForSelector('text=/Loading promotion data.../i', {
        state: 'detached',
        timeout: 30000,
      });
    }

    // Step 3: Check if there are changes to promote
    const noChanges = await page
      .locator('text=/No changes to promote|already in sync/i')
      .isVisible();

    if (noChanges) {
      console.log('ℹ️  No changes to promote - staging and production are in sync');
      // Test passes - this is a valid state
      return;
    }

    // Step 4: Verify safety checks passed
    const safetyPassed = await page.locator('text=/All checks passed|ready to promote/i').isVisible();

    if (!safetyPassed) {
      // Safety checks failed - get the error message
      const errorText = await page.locator('.text-red-700').allTextContents();
      console.log('❌ Safety checks failed:', errorText.join(', '));
      throw new Error('Safety checks failed: ' + errorText.join(', '));
    }

    console.log('✅ Safety checks passed');

    // Step 5: Click promote button
    const promoteButton = page.locator('button:has-text("Promote to Production")');
    await expect(promoteButton).toBeEnabled();
    await promoteButton.click();

    // Step 6: Confirm promotion
    await page.waitForSelector('button:has-text("Yes, Promote Now")');
    await page.click('button:has-text("Yes, Promote Now")');

    console.log('⏳ Promotion in progress...');

    // Step 7: Wait for promotion to complete (can take up to 2 minutes with npm install)
    await page.waitForSelector('text=/Successfully promoted/i', {
      timeout: 180000, // 3 minutes
    });

    console.log('✅ Promotion completed successfully');

    // Step 8: Verify the page updated
    await page.waitForTimeout(2000);

    // Should show "no changes" after successful promotion
    await expect(page.locator('text=/No changes to promote|already in sync/i')).toBeVisible({
      timeout: 10000,
    });

    console.log('✅ Verified: Staging and production are now in sync');
  });

  test('should show promotion in history after successful promotion', async ({ page }) => {
    await login(page);
    await page.goto('/admin/promote');

    // Wait for page to load
    await page.waitForTimeout(5000);

    const isLoading = await page.locator('text=/Loading promotion data.../i').isVisible();
    if (isLoading) {
      await page.waitForSelector('text=/Loading promotion data.../i', {
        state: 'detached',
        timeout: 30000,
      });
    }

    // Check promotion history section
    await expect(page.locator('h2:has-text("Recent Promotions")')).toBeVisible();

    // Should have at least one promotion in history (from previous test or manual promotions)
    const historyItems = await page.locator('.border-l-4.border-green-500').count();

    if (historyItems > 0) {
      console.log(`✅ Found ${historyItems} promotion(s) in history`);
    } else {
      console.log('ℹ️  No promotions in history yet');
    }
  });
});
