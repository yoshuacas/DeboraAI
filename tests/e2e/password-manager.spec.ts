import { test, expect } from '@playwright/test';

/**
 * E2E Test for Password Manager Integration
 *
 * Verifies that the login form has the correct attributes
 * for browser password managers (Chrome, Firefox, etc.)
 */

const BASE_URL = 'http://localhost:3000';

test.describe('Password Manager Integration', () => {
  test('login form should have correct attributes for password managers', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);

    // Check that form element exists
    const form = page.locator('form');
    await expect(form).toBeVisible();

    // Check username/email field has correct attributes
    const usernameField = page.locator('input[type="email"]');
    await expect(usernameField).toHaveAttribute('name', 'username');
    await expect(usernameField).toHaveAttribute('autoComplete', 'username');
    await expect(usernameField).toHaveAttribute('id', 'email');

    // Check password field has correct attributes
    const passwordField = page.locator('input[type="password"]');
    await expect(passwordField).toHaveAttribute('name', 'password');
    await expect(passwordField).toHaveAttribute('autoComplete', 'current-password');
    await expect(passwordField).toHaveAttribute('id', 'password');

    // Check submit button exists and is type="submit"
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    console.log('✅ All password manager attributes are correct');
  });

  test('form should be submittable via Enter key', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill in credentials
    await page.fill('input[type="email"]', 'lawyer@deboraai.local');
    await page.fill('input[type="password"]', 'lawyer123');

    // Press Enter on password field (simulates user pressing Enter)
    await page.press('input[type="password"]', 'Enter');

    // Should navigate to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);

    console.log('✅ Form submits correctly with Enter key');
  });
});
