import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Lawyer Dashboard
 *
 * Tests the complete user journey:
 * 1. Login as lawyer
 * 2. Access dashboard
 * 3. Verify stats are displayed
 * 4. Test navigation to different sections
 */

const LAWYER_EMAIL = 'lawyer@deboraai.local';
const LAWYER_PASSWORD = 'lawyer123';
const BASE_URL = 'http://localhost:3000';

test.describe('Lawyer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the login page
    await page.goto(`${BASE_URL}/login`);
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('DeboraAI');
    await expect(page.locator('h2')).toContainText('Sign in to Admin Panel');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should login successfully as lawyer', async ({ page }) => {
    // Fill in credentials
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);

    // Submit form and wait for navigation
    await Promise.all([
      page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 }),
      page.click('button[type="submit"]'),
    ]);

    // Verify we're on dashboard
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display dashboard with stats after login', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Check header
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

    // Check stats cards are displayed
    await expect(page.locator('text=Clientes')).toBeVisible();
    await expect(page.locator('text=Casos')).toBeVisible();
    await expect(page.locator('text=Documentos')).toBeVisible();
    await expect(page.locator('text=Eventos')).toBeVisible();

    // Check sections
    await expect(page.locator('text=Casos Recientes')).toBeVisible();
    await expect(page.locator('text=Próximos Eventos')).toBeVisible();
    await expect(page.locator('text=Acciones Rápidas')).toBeVisible();
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Check sidebar navigation items
    await expect(page.locator('nav a', { hasText: 'Inicio' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Clientes' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Casos' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Documentos' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Chat con Debora' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Biblioteca' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Plantillas' })).toBeVisible();
    await expect(page.locator('nav a', { hasText: 'Calendario' })).toBeVisible();
  });

  test('should navigate to clientes page', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Click on Clientes in sidebar
    await page.click('nav a:has-text("Clientes")');

    // Should navigate to clientes page
    await expect(page).toHaveURL(`${BASE_URL}/clientes`);
    await expect(page.locator('h1', { hasText: 'Clientes' })).toBeVisible();
  });

  test('should navigate to casos page', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Click on Casos in sidebar
    await page.click('nav a:has-text("Casos")');

    // Should navigate to casos page
    await expect(page).toHaveURL(`${BASE_URL}/casos`);
    await expect(page.locator('h1', { hasText: 'Casos' })).toBeVisible();
  });

  test('should navigate back to dashboard from other pages', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Navigate to clientes
    await page.click('nav a:has-text("Clientes")');
    await expect(page).toHaveURL(`${BASE_URL}/clientes`);

    // Navigate back to dashboard
    await page.click('nav a:has-text("Inicio")');
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();
  });

  test('should display user info in header', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Check user info is displayed
    await expect(page.locator(`text=${LAWYER_EMAIL}`)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', LAWYER_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/dashboard`);

    // Click logout button
    await page.click('button:has-text("Salir")');

    // Should redirect to login
    await page.waitForURL(`${BASE_URL}/login`, { timeout: 10000 });
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('should protect dashboard route when not logged in', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/login');
    expect(page.url()).toContain('callbackUrl');
  });

  test('should show login error with wrong credentials', async ({ page }) => {
    // Try to login with wrong password
    await page.fill('input[type="email"]', LAWYER_EMAIL);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
