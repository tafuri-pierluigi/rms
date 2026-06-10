/**
 * ATTR-01 … ATTR-09, PROD-01, PROD-02
 * Prodotti e attributi catalogo: CRUD + protezione cancellazione se in uso.
 *
 * NOTE: BaseModal uses <Teleport to="body">, so modal inputs appear AFTER page
 * inputs in DOM order. Always scope modal interactions to `.modal-overlay`.
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN = { email: 'admin@acme.com', password: 'Password123!' };

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForURL('**/app**', { timeout: 10_000 });
}

/** Clicks the danger (delete) action button in the table row containing rowText. */
async function clickDeleteInRow(page: Page, rowText: string) {
  const row = page.locator('tbody tr').filter({ hasText: rowText }).first();
  await row.locator('button.action-btn--danger, [class*="action-btn--danger"]').click();
}

/** Confirms the delete confirmation modal by clicking the danger/delete button inside it. */
async function confirmDeleteModal(page: Page) {
  const modal = page.locator('.modal-overlay').last();
  await expect(modal).toBeVisible({ timeout: 4_000 });
  await modal.locator('button').filter({ hasText: /elimina|delete/i }).click();
}

/** Returns the first visible alert/error message on the page, or '' if none within 4s. */
async function getErrorMessage(page: Page): Promise<string> {
  const selectors = [
    '.alert-danger',
    '[class*="alert"]',
    '[class*="toast"]',
    '[class*="error"]',
    '[class*="notification"]',
  ];
  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 4_000 }).catch(() => false)) {
      return (await el.textContent()) ?? '';
    }
  }
  return '';
}

// ─── Deletion protection ──────────────────────────────────────────────────────

test.describe('Catalog — attributes deletion protection', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ATTR-03 — Brand in uso → bloccato
  test('deleting a brand assigned to products shows conflict error', async ({ page }) => {
    await page.goto('/app/catalog/brands');
    await page.waitForLoadState('networkidle');

    const firstBrandName = (await page.locator('tbody tr td').first().textContent())?.trim() ?? '';
    if (!firstBrandName) { test.skip(); return; }

    await clickDeleteInRow(page, firstBrandName);
    await confirmDeleteModal(page);

    const msg = await getErrorMessage(page);
    const isBlocked =
      msg.toLowerCase().includes('product') ||
      msg.toLowerCase().includes('uso') ||
      msg.length > 0;
    expect(isBlocked).toBe(true);

    // Brand still in list
    await expect(page.locator('tbody tr').filter({ hasText: firstBrandName }).first()).toBeVisible();
  });

  // ATTR-04 — Colore in uso → bloccato
  test('deleting a color used by variants shows conflict error', async ({ page }) => {
    await page.goto('/app/catalog/colors');
    await page.waitForLoadState('networkidle');

    const firstName = (await page.locator('tbody tr td').first().textContent())?.trim() ?? '';
    if (!firstName) { test.skip(); return; }

    await clickDeleteInRow(page, firstName);
    await confirmDeleteModal(page);

    const msg = await getErrorMessage(page);
    expect(msg.length).toBeGreaterThan(0);
    await expect(page.locator('tbody tr').filter({ hasText: firstName }).first()).toBeVisible();
  });

  // ATTR-05 — Scala taglie in uso → bloccata
  test('deleting a size scale assigned to products shows conflict error', async ({ page }) => {
    await page.goto('/app/catalog/size-scales');
    await page.waitForLoadState('networkidle');

    const firstName = (await page.locator('tbody tr td').first().textContent())?.trim() ?? '';
    if (!firstName) { test.skip(); return; }

    await clickDeleteInRow(page, firstName);
    await confirmDeleteModal(page);

    const msg = await getErrorMessage(page);
    expect(msg.length).toBeGreaterThan(0);
    await expect(page.locator('tbody tr').filter({ hasText: firstName }).first()).toBeVisible();
  });
});

// ─── Create and delete unused attribute ──────────────────────────────────────

test.describe('Catalog — create and delete unused attribute', () => {
  const BRAND_NAME = `QA Brand ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ATTR-01 + ATTR-02
  test('creates a brand then deletes it when unused', async ({ page }) => {
    await page.goto('/app/catalog/brands');
    await page.waitForLoadState('networkidle');

    // Click "Nuovo Brand" button
    await page.locator('button').filter({ hasText: /Nuovo Brand/i }).click();

    // Modal opens — fill name input scoped to .modal-overlay (Teleported to body)
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 4_000 });
    await modal.locator('input').first().fill(BRAND_NAME);

    // Submit
    await modal.locator('button[type="submit"], .form-actions button').last().click();
    await page.waitForTimeout(600);

    // Brand appears in table
    await expect(page.locator('tbody tr').filter({ hasText: BRAND_NAME }).first()).toBeVisible({ timeout: 6_000 });

    // Delete
    await clickDeleteInRow(page, BRAND_NAME);
    await confirmDeleteModal(page);
    await page.waitForTimeout(600);

    // Brand gone from table rows
    await expect(page.locator('tbody tr').filter({ hasText: BRAND_NAME })).toHaveCount(0, { timeout: 6_000 });
  });

  // ATTR-09 — Duplicato bloccato
  test('creating a brand with an existing name shows conflict error', async ({ page }) => {
    await page.goto('/app/catalog/brands');
    await page.waitForLoadState('networkidle');

    const existingName = (await page.locator('tbody tr td').first().textContent())?.trim() ?? '';
    if (!existingName) { test.skip(); return; }

    await page.locator('button').filter({ hasText: /Nuovo Brand/i }).click();

    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 4_000 });
    await modal.locator('input').first().fill(existingName);
    await modal.locator('button[type="submit"], .form-actions button').last().click();
    await page.waitForTimeout(800);

    const msg = await getErrorMessage(page);
    expect(msg.toLowerCase()).toMatch(/exist|esiste|duplicat|already/);
  });
});

// ─── Products ─────────────────────────────────────────────────────────────────

test.describe('Catalog — products', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // PROD-02 — Ricerca prodotto per SKU
  test('product search by SKU filters results', async ({ page }) => {
    await page.goto('/app/catalog/products');
    await page.waitForLoadState('networkidle');

    // Wait for table to have data
    await page.waitForSelector('tbody tr td:not([colspan])', { timeout: 10_000 }).catch(() => {});

    // Get SKU from second column of first row
    const firstSku = (await page.locator('tbody tr td').nth(1).textContent())?.trim().split(/\s+/)[0] ?? '';
    if (!firstSku) return;

    // Scope search to .content-wrap to avoid GlobalSearch in AppHeader
    const searchInput = page.locator('.content-wrap input[placeholder*="cerca" i], .content-wrap input[placeholder*="search" i]').first();
    await searchInput.fill(firstSku);
    await page.waitForTimeout(600);

    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    const firstRowText = await rows.first().textContent();
    expect(firstRowText).toContain(firstSku);
  });
});
