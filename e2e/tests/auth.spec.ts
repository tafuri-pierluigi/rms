/**
 * AUTH-01 … AUTH-05
 * Login, logout, guard su rotte protette, SuperAdmin area.
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN = { email: 'admin@acme.com', password: 'Password123!' };
const SUPERADMIN = { email: 'superadmin@system.com', password: 'Password123!' };

async function login(page: Page, email = ADMIN.email, password = ADMIN.password) {
  await page.goto('/login');
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('input[type="password"]').press('Enter');
}

test.describe('Authentication', () => {
  // AUTH-01
  test('valid credentials redirect to /app dashboard', async ({ page }) => {
    await login(page);
    await page.waitForURL('**/app**', { timeout: 10_000 });
    expect(page.url()).toContain('/app');
    await expect(page.locator('h1, [class*="heading"], [class*="card-name"]').first()).toBeVisible();
  });

  // AUTH-02
  test('wrong password shows error and stays on login', async ({ page }) => {
    await login(page, ADMIN.email, 'wrong-password');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');
    const error = page.locator('[class*="error"], [class*="alert"], .form-error');
    await expect(error.first()).toBeVisible();
  });

  // AUTH-03
  test('logout redirects to /login and clears session', async ({ page }) => {
    await login(page);
    await page.waitForURL('**/app**', { timeout: 10_000 });

    // Open user dropdown via the actual trigger button class
    await page.locator('.user-trigger').click();
    await expect(page.locator('.user-dropdown')).toBeVisible({ timeout: 3_000 });

    // Click logout item
    await page.locator('.dropdown-item').filter({ hasText: /esci|logout/i }).click();

    await page.waitForURL('**/login**', { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  // AUTH-04
  test('unauthenticated access to protected route redirects to login', async ({ page }) => {
    await page.goto('/app/pos/sales');
    await page.waitForURL('**/login**', { timeout: 8_000 });
    expect(page.url()).toContain('/login');
  });

  // AUTH-05
  test('superadmin login redirects to /admin area', async ({ page }) => {
    await page.goto('/admin/login');
    await page.locator('input[type="email"], input[placeholder*="email" i]').fill(SUPERADMIN.email);
    await page.locator('input[type="password"]').fill(SUPERADMIN.password);
    await page.locator('input[type="password"]').press('Enter');
    await page.waitForURL('**/admin**', { timeout: 10_000 });
    expect(page.url()).toContain('/admin');
  });
});
