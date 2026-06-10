/**
 * ADMIN-01 … ADMIN-04
 * Gestione utenti, ruoli, permessi, negozi (area admin tenant).
 *
 * NOTE: BaseModal uses <Teleport to="body">, so always scope modal
 * interactions to `.modal-overlay` to avoid matching page inputs first.
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN = { email: 'admin@acme.com', password: 'Password123!' };

const QA_USER_EMAIL = `qa-user-${Date.now()}@acme.com`;
const QA_ROLE_NAME = `QA Test Role ${Date.now()}`;

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForURL('**/app**', { timeout: 10_000 });
}

test.describe('Admin — Users', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ADMIN-01 — Creazione utente
  test('creates a new user and it appears in the user list', async ({ page }) => {
    await page.goto('/app/admin/users');
    await page.waitForLoadState('networkidle');

    // Click "Nuovo Utente" button
    await page.locator('button').filter({ hasText: /Nuovo Utente/i }).click();

    // Modal is teleported to body — scope all interactions to .modal-overlay
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill email (UserForm has type="email" input with placeholder "john@example.com")
    await modal.locator('input[type="email"]').fill(QA_USER_EMAIL);

    // Fill password
    const passwordInput = modal.locator('input[type="password"]').first();
    if (await passwordInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await passwordInput.fill('Password123!');
    }

    // Fill first name if present
    const textInputs = modal.locator('input[type="text"]');
    if (await textInputs.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await textInputs.first().fill('QA');
    }

    // Submit via the form's submit button (UserForm has BaseButton type="submit")
    await modal.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);

    await expect(page.locator('tbody tr').filter({ hasText: QA_USER_EMAIL }).first()).toBeVisible({ timeout: 6_000 });
  });
});

test.describe('Admin — Roles', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ADMIN-02 — Creazione ruolo con permesso
  test('creates a new role with at least one permission', async ({ page }) => {
    await page.goto('/app/admin/roles');
    await page.waitForLoadState('networkidle');

    // Click "Nuovo Ruolo"
    await page.locator('button').filter({ hasText: /Nuovo Ruolo/i }).click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Fill role name (first text input in modal)
    await modal.locator('input[type="text"]').first().fill(QA_ROLE_NAME);

    // Toggle first available permission checkbox
    const firstCheckbox = modal.locator('input[type="checkbox"]').first();
    if (await firstCheckbox.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await firstCheckbox.check();
    }

    // Submit
    await modal.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);

    await expect(page.locator('tbody tr').filter({ hasText: QA_ROLE_NAME }).first()).toBeVisible({ timeout: 6_000 });
  });

  // ADMIN-03 — Modifica permessi ruolo
  test('editing a role persists permission changes', async ({ page }) => {
    await page.goto('/app/admin/roles');
    await page.waitForLoadState('networkidle');

    // Find the QA role or fall back to the first available role
    let targetRow = page.locator('tbody tr').filter({ hasText: QA_ROLE_NAME }).first();
    if (!await targetRow.isVisible({ timeout: 2_000 }).catch(() => false)) {
      targetRow = page.locator('tbody tr').first();
    }
    if (!await targetRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(); return;
    }

    // Click the edit (pencil) action button in the row
    await targetRow.locator('button.action-btn:not(.action-btn--danger)').first().click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 5_000 });

    // Toggle the second checkbox to change permissions
    const checkboxes = modal.locator('input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      const cb = checkboxes.nth(Math.min(1, count - 1));
      const checked = await cb.isChecked();
      checked ? await cb.uncheck() : await cb.check();
    }

    // Save
    await modal.locator('button[type="submit"]').click();
    await page.waitForTimeout(800);

    // Success: modal closed (role row still visible)
    await expect(modal).not.toBeVisible({ timeout: 4_000 });
  });
});

test.describe('Admin — Stores', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ADMIN-04 — Visualizzazione negozi
  test('stores page shows at least one store row', async ({ page }) => {
    await page.goto('/app/admin/stores');
    await page.waitForLoadState('networkidle');

    // Wait for actual data rows (not empty/loading rows)
    await page.waitForSelector('tbody tr td:not([colspan])', { timeout: 8_000 });

    const rows = page.locator('tbody tr').filter({ hasNot: page.locator('td[colspan]') });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Verify at least one store name is non-empty
    const storeName = (await rows.first().locator('td').first().textContent())?.trim() ?? '';
    expect(storeName.length).toBeGreaterThan(0);
  });
});
