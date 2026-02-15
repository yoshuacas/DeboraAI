import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flow
 * Tests login, logout, and protected route access
 */

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access admin page without authentication
    await page.goto('/admin/code');

    // Should be redirected to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('callbackUrl');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message or stay on login page
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
  });

  test('should login with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in admin credentials
    await page.fill('input[name="email"]', 'admin@deboraai.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Should redirect to admin page
    await page.waitForURL(/\/admin/, { timeout: 10000 });
    expect(page.url()).toContain('/admin');
  });

  test('should access protected routes when authenticated', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@deboraai.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Try to access various admin pages
    await page.goto('/admin/code');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/admin/code');

    await page.goto('/admin/history');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/admin/history');

    await page.goto('/admin/promote');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/admin/promote');
  });

  test('should show user info in admin header', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@deboraai.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Check for user info in header
    await expect(page.locator('text=Admin User')).toBeVisible();
    await expect(page.locator('text=admin@deboraai.local')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@deboraai.local');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');

    // Try to access admin page - should be redirected to login
    await page.goto('/admin/code');
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain('/login');
  });
});
