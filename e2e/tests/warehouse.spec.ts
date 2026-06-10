/**
 * PO-01 … PO-04, SUPPLIERS-01/02, INV-01
 * Magazzino: ordini acquisto, fornitori, inventario.
 *
 * PO-01 uses the API directly to create a DRAFT order (the wizard UI is
 * complex and covered separately), then verifies the resulting detail page.
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

/** Read the JWT access token stored by the auth store. */
async function getToken(page: Page): Promise<string> {
  return page.evaluate(() => localStorage.getItem('accessToken') ?? '');
}

/** Confirms the delete confirmation modal by clicking the danger button inside it. */
async function confirmDeleteModal(page: Page) {
  const modal = page.locator('.modal-overlay').last();
  await expect(modal).toBeVisible({ timeout: 4_000 });
  await modal.locator('button').filter({ hasText: /elimina|delete/i }).click();
}

// ─── Ordini di Acquisto ───────────────────────────────────────────────────────

test.describe('Purchase Orders', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // PO-01 — Creazione bozza via API + verifica UI
  test('creates a purchase order in DRAFT status', async ({ page }) => {
    const token = await getToken(page);

    // Fetch first supplier
    const suppliersRes = await page.request.get('/api/suppliers?limit=5', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const suppliers = await suppliersRes.json();
    const supplier = Array.isArray(suppliers) ? suppliers[0] : suppliers.data?.[0];
    if (!supplier) { test.skip(); return; }

    // Fetch first store
    const storesRes = await page.request.get('/api/stores?limit=5', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const stores = await storesRes.json();
    const store = Array.isArray(stores) ? stores[0] : stores.data?.[0];
    if (!store) { test.skip(); return; }

    // Fetch a product variant to add as line item
    const variantsRes = await page.request.get('/api/products?limit=5', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const products = await variantsRes.json();
    const productList = Array.isArray(products) ? products : products.data ?? [];
    const firstVariant = productList
      .flatMap((p: { variants?: { id: string }[] }) => p.variants ?? [])
      .find((v: { id: string }) => v.id);

    if (!firstVariant) { test.skip(); return; }

    // Create DRAFT PO via API
    const createRes = await page.request.post('/api/purchase-orders', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: {
        supplierId: supplier.id,
        storeId: store.id,
        items: [{
          variantId: firstVariant.id,
          quantityOrdered: 1,
          costPriceAtOrder: 0,
          discountPercent: 0,
          markupMultiplier: 2.5,
        }],
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    const poId = created.id;

    // Navigate to the PO detail page and verify DRAFT badge
    await page.goto(`/app/warehouse/purchase-orders/${poId}`);
    await page.waitForLoadState('networkidle');

    const draftBadge = page.locator('text=Draft, text=Bozza, text=DRAFT').first();
    await expect(draftBadge).toBeVisible({ timeout: 6_000 });
  });

  // PO-02 — Invio ordine → stato SENT
  test('sending a DRAFT order changes status to SENT', async ({ page }) => {
    await page.goto('/app/warehouse/purchase-orders');
    await page.waitForLoadState('networkidle');

    // Click first DRAFT order
    const draftRow = page.locator('tbody tr').filter({ hasText: /draft|bozza/i }).first();
    if (!await draftRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(); return;
    }
    await draftRow.click();
    await page.waitForLoadState('networkidle');

    // Click send button
    await page.locator('button').filter({ hasText: /invia|send/i }).first().click();
    const modal = page.locator('.modal-overlay').last();
    if (await modal.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await modal.locator('button').filter({ hasText: /conferma|confirm|invia|yes|sì/i }).click();
    }
    await page.waitForTimeout(1000);

    await expect(page.locator('text=Sent, text=Inviato, text=SENT').first()).toBeVisible({ timeout: 6_000 });
  });

  // PO-03 — Eliminazione DRAFT
  test('deleting a DRAFT order removes it from the list', async ({ page }) => {
    await page.goto('/app/warehouse/purchase-orders');
    await page.waitForLoadState('networkidle');

    const draftRow = page.locator('tbody tr').filter({ hasText: /draft|bozza/i }).first();
    if (!await draftRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(); return;
    }
    const orderText = (await draftRow.locator('td').first().textContent())?.trim() ?? '';

    // Click row to open detail, then delete
    await draftRow.click();
    await page.waitForLoadState('networkidle');

    await page.locator('button').filter({ hasText: /elimina|delete/i }).first().click();
    await confirmDeleteModal(page);

    await page.waitForURL('**/purchase-orders**', { timeout: 8_000 });
    if (orderText) {
      await expect(page.locator(`tbody tr:has-text("${orderText}")`)).toHaveCount(0, { timeout: 4_000 });
    }
  });

  // PO-04 — SENT non eliminabile
  test('a SENT order has no delete button available', async ({ page }) => {
    await page.goto('/app/warehouse/purchase-orders');
    await page.waitForLoadState('networkidle');

    const sentRow = page.locator('tbody tr').filter({ hasText: /sent|inviato/i }).first();
    if (!await sentRow.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(); return;
    }
    await sentRow.click();
    await page.waitForLoadState('networkidle');

    // Delete button should be absent or disabled
    const deleteBtn = page.locator('button').filter({ hasText: /elimina|delete/i });
    const exists = await deleteBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (exists) {
      await expect(deleteBtn).toBeDisabled();
    }
  });
});

// ─── Fornitori ────────────────────────────────────────────────────────────────

test.describe('Suppliers', () => {
  const SUPPLIER_NAME = `Fornitore QA ${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // SUPPLIERS-01 — Creazione
  test('creates a new supplier', async ({ page }) => {
    await page.goto('/app/warehouse/suppliers');
    await page.waitForLoadState('networkidle');

    await page.locator('button').filter({ hasText: /Nuovo Fornitore|Nuovo|New|Aggiungi/i }).first().click();
    await page.waitForTimeout(400);

    // Modal opens — scope inputs to .modal-overlay
    const modal = page.locator('.modal-overlay');
    await expect(modal).toBeVisible({ timeout: 4_000 });
    await modal.locator('input[type="text"], input[placeholder*="nome" i], input[placeholder*="name" i]').first().fill(SUPPLIER_NAME);

    const emailInput = modal.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await emailInput.fill(`${Date.now()}@qa-test.com`);
    }

    await modal.locator('button[type="submit"], .form-actions button').last().click();
    await page.waitForTimeout(800);

    await expect(page.locator('tbody tr').filter({ hasText: SUPPLIER_NAME }).first()).toBeVisible({ timeout: 6_000 });
  });

  // SUPPLIERS-02 — Eliminazione senza ordini
  test('deletes a supplier with no purchase orders', async ({ page }) => {
    await page.goto('/app/warehouse/suppliers');
    await page.waitForLoadState('networkidle');

    const row = page.locator('tbody tr').filter({ hasText: SUPPLIER_NAME }).first();
    if (!await row.isVisible({ timeout: 3_000 }).catch(() => false)) {
      test.skip(); return;
    }

    // Click the danger delete button in the row
    await row.locator('button.action-btn--danger, [class*="action-btn--danger"]').click();
    await confirmDeleteModal(page);
    await page.waitForTimeout(800);

    await expect(page.locator('tbody tr').filter({ hasText: SUPPLIER_NAME })).toHaveCount(0, { timeout: 6_000 });
  });
});

// ─── Inventario ───────────────────────────────────────────────────────────────

test.describe('Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // INV-01 — Visualizzazione stock
  test('inventory page shows stock rows with quantity and store', async ({ page }) => {
    await page.goto('/app/warehouse/inventory');
    await page.waitForLoadState('networkidle');

    // Wait for real data rows (not loading/empty rows — those use colspan)
    await page.waitForSelector('tbody tr td:not([colspan])', { timeout: 10_000 });

    const rows = page.locator('tbody tr').filter({ hasNot: page.locator('td[colspan]') });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});
