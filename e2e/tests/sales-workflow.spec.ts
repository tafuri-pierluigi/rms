/**
 * End-to-end workflow: login → nuova vendita → verifica stock/pagamento
 *
 * Copre:
 *  1. Login con credenziali admin
 *  2. Creazione vendita con prodotto reale
 *  3. Selezione negozio (abilita stock check)
 *  4. Blocco aggiunta articolo oltre stock
 *  5. Blocco "Completa Vendita" se pagamento non esatto
 *  6. Vendita completata con pagamento esatto → redirect a dettaglio
 *  7. Metodo di pagamento non-cash (GiftCard) funziona
 */

import { test, expect, Page } from '@playwright/test';

const ADMIN = { email: 'admin@acme.com', password: 'Password123!' };

// ─── helpers ───────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('input[type="email"], input[placeholder*="email" i]').fill(ADMIN.email);
  await page.locator('input[type="password"]').fill(ADMIN.password);
  await page.locator('input[type="password"]').press('Enter');
  await page.waitForURL('**/app**');
}

async function goToNewSale(page: Page) {
  // Navigate via JS click to avoid viewport issues with sidebar links
  await page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>('a[href="/app/pos/sales"]');
    link?.click();
  });
  await page.waitForURL('**/pos/sales**');

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Nuova Vendita'),
    ) as HTMLButtonElement | undefined;
    btn?.click();
  });
  await page.waitForURL('**/pos/sales/create**');
}

async function selectStore(page: Page, storeName = 'Acme Corporation - Main Store') {
  await page.locator('select').selectOption({ label: storeName });
}

async function searchAndAddProduct(page: Page, query: string, productText: string) {
  const searchInput = page.locator('input[placeholder="Cerca SKU, prodotto, barcode..."]');
  await searchInput.fill(query);
  await page.waitForSelector('.search-item');

  await page.evaluate((text) => {
    const btn = [...document.querySelectorAll<HTMLButtonElement>('.search-item')].find((b) =>
      b.textContent?.includes(text),
    );
    btn?.click();
  }, productText);
}

// ─── tests ─────────────────────────────────────────────────────────────────

test.describe('Sales workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToNewSale(page);
  });

  test('login redirects to /app dashboard', async ({ page }) => {
    expect(page.url()).toContain('/app');
    await expect(page.locator('h1, [class*="heading"]').first()).toBeVisible();
  });

  test('nuova vendita page loads with empty cart', async ({ page }) => {
    await expect(page.locator('text=Carrello vuoto')).toBeVisible();
    // Pay button disabled when cart is empty
    const payBtn = page.locator('button:has-text("Completa Vendita"), button:has-text("Procedi al Pagamento")');
    await expect(payBtn).toBeDisabled();
  });

  test('selecting a store enables stock-aware product search', async ({ page }) => {
    await selectStore(page);
    const searchInput = page.locator('input[placeholder="Cerca SKU, prodotto, barcode..."]');
    await searchInput.fill('maglia');
    await page.waitForSelector('.search-item');
    // Stock badge (×N) appears in results when store is selected
    const stockBadge = page.locator('.search-item__stock').first();
    await expect(stockBadge).toBeVisible();
  });

  test('adding item updates cart total correctly', async ({ page }) => {
    await selectStore(page);
    // Find a product with stock ≥ 1
    await searchAndAddProduct(page, 'maglia', 'NER-MED');
    // Subtotal should be non-zero
    const subtotal = page.locator('.totals-row strong').first();
    await expect(subtotal).not.toHaveText('0,00 €');
  });

  test('clicking + beyond stock shows error and keeps quantity', async ({ page }) => {
    await selectStore(page);
    // Add product with stock = 1 (BLU-SMA ×1)
    await searchAndAddProduct(page, 'maglia', 'BLU-SMA');

    // Click + to try to exceed stock
    const plusBtns = page.locator('.qty-btn');
    await plusBtns.nth(1).click({ force: true });

    // Error message visible, qty still 1
    await expect(page.locator('.alert--error')).toBeVisible();
    await expect(page.locator('.qty-value')).toHaveText('1');
  });

  test('payment modal: underpayment disables Completa Vendita', async ({ page }) => {
    await selectStore(page);
    await searchAndAddProduct(page, 'maglia', 'NER-MED');

    // Open payment
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Pagamento'),
      ) as HTMLButtonElement;
      btn?.click();
    });
    await page.waitForSelector('.payment-row select');

    // Set amount to 0 (less than total)
    await page.locator('.payment-row input[type="number"]').fill('0');

    const completeBtn = page.locator('button:has-text("Completa Vendita")');
    await expect(completeBtn).toBeDisabled();
    // Balance indicator shows "short" state
    await expect(page.locator('.balance--short')).toBeVisible();
  });

  test('payment modal: overpayment disables Completa Vendita and shows error state', async ({ page }) => {
    await selectStore(page);
    await searchAndAddProduct(page, 'maglia', 'NER-MED');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Pagamento'),
      ) as HTMLButtonElement;
      btn?.click();
    });
    await page.waitForSelector('.payment-row select');

    // Get the actual total and overpay
    const totalText = await page.locator('.totals-row--total strong').last().textContent();
    const total = parseFloat(totalText?.replace(/[^0-9,]/g, '').replace(',', '.') ?? '0');
    await page.locator('.payment-row input[type="number"]').fill(String(total + 50));

    const completeBtn = page.locator('button:has-text("Completa Vendita")');
    await expect(completeBtn).toBeDisabled();
    // Over state shown
    await expect(page.locator('.balance--over')).toBeVisible();
  });

  test('payment modal: exact payment enables Completa Vendita and shows OK state', async ({ page }) => {
    await selectStore(page);
    await searchAndAddProduct(page, 'maglia', 'NER-MED');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Pagamento'),
      ) as HTMLButtonElement;
      btn?.click();
    });
    await page.waitForSelector('.payment-row select');

    // The amount is pre-filled with the exact total by openPayment()
    await expect(page.locator('.balance--ok')).toBeVisible();
    const completeBtn = page.locator('button:has-text("Completa Vendita")');
    await expect(completeBtn).toBeEnabled();
  });

  test('GiftCard payment method submits correctly and creates sale', async ({ page }) => {
    await selectStore(page);
    await searchAndAddProduct(page, 'maglia', 'NER-MED');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Pagamento'),
      ) as HTMLButtonElement;
      btn?.click();
    });
    await page.waitForSelector('.payment-row select');

    // Switch to GiftCard
    await page.locator('.payment-row select').selectOption('GiftCard');

    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(
        (b) => b.textContent?.trim() === 'Completa Vendita',
      ) as HTMLButtonElement;
      btn?.click();
    });

    // Should redirect to sale detail
    await page.waitForURL(/\/pos\/sales\/[0-9a-f-]{36}/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/pos\/sales\/[0-9a-f-]{36}/);
  });

  test('completed sale detail shows correct payment method label', async ({ page }) => {
    await selectStore(page);
    await searchAndAddProduct(page, 'maglia', 'NER-MED');

    await page.evaluate(() => {
      (
        [...document.querySelectorAll('button')].find((b) =>
          b.textContent?.includes('Pagamento'),
        ) as HTMLButtonElement
      )?.click();
    });
    await page.waitForSelector('.payment-row select');
    await page.locator('.payment-row select').selectOption('Card');

    await page.evaluate(() => {
      (
        [...document.querySelectorAll('button')].find(
          (b) => b.textContent?.trim() === 'Completa Vendita',
        ) as HTMLButtonElement
      )?.click();
    });

    await page.waitForURL(/\/pos\/sales\/[0-9a-f-]{36}/, { timeout: 10_000 });
    // Payment row in the detail table shows the human-readable label
    await expect(page.locator('td:has-text("Card"), td:has-text("Carta")')).toBeVisible();
  });
});
