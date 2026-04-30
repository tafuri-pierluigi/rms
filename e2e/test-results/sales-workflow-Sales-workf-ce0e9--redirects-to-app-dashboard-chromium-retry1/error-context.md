# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sales-workflow.spec.ts >> Sales workflow >> login redirects to /app dashboard
- Location: tests/sales-workflow.spec.ts:70:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h1, [class*="heading"]').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for locator('h1, [class*="heading"]').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e5]:
      - button [ref=e6] [cursor=pointer]:
        - img [ref=e7]
      - link "RMS" [ref=e8] [cursor=pointer]:
        - /url: /app
        - img [ref=e10]
        - generic [ref=e12]: RMS
    - generic [ref=e14]:
      - generic:
        - img
      - textbox "Cerca prodotto, SKU, codice a barre..." [ref=e15]
    - generic [ref=e16]:
      - generic [ref=e17]:
        - generic [ref=e18]: John Admin
        - generic [ref=e19]: Admin
      - group "Language" [ref=e20]:
        - button "IT" [ref=e22] [cursor=pointer]
        - button "EN" [ref=e23] [cursor=pointer]
      - button "Esci" [ref=e24] [cursor=pointer]:
        - img [ref=e25]
        - text: Esci
  - complementary [ref=e28]:
    - navigation [ref=e29]:
      - link "Home" [ref=e30] [cursor=pointer]:
        - /url: /app
        - img [ref=e31]
        - generic [ref=e34]: Home
      - generic [ref=e36]:
        - button "Cassa" [ref=e37] [cursor=pointer]:
          - generic [ref=e39]: Cassa
          - img [ref=e40]
        - generic [ref=e42]:
          - link "Vendita" [ref=e43] [cursor=pointer]:
            - /url: /app/pos/sales
            - img [ref=e44]
            - generic [ref=e46]: Vendita
          - link "Resi" [ref=e47] [cursor=pointer]:
            - /url: /app/pos/returns
            - img [ref=e48]
            - generic [ref=e51]: Resi
          - link "Clienti" [ref=e52] [cursor=pointer]:
            - /url: /app/pos/customers
            - img [ref=e53]
            - generic [ref=e58]: Clienti
      - generic [ref=e59]:
        - button "Magazzino" [ref=e60] [cursor=pointer]:
          - generic [ref=e62]: Magazzino
          - img [ref=e63]
        - generic:
          - link "Ordini di Acquisto" [ref=e65] [cursor=pointer]:
            - /url: /app/warehouse/purchase-orders
            - img [ref=e66]
            - generic [ref=e69]: Ordini di Acquisto
          - link "Inventario" [ref=e70] [cursor=pointer]:
            - /url: /app/warehouse/inventory
            - img [ref=e71]
            - generic [ref=e81]: Inventario
          - link "Movimenti di Stock" [ref=e82] [cursor=pointer]:
            - /url: /app/warehouse/movements
            - img [ref=e83]
            - generic [ref=e86]: Movimenti di Stock
          - link "Trasferimenti" [ref=e87] [cursor=pointer]:
            - /url: /app/warehouse/store-transfers
            - img [ref=e88]
            - generic [ref=e91]: Trasferimenti
      - generic [ref=e92]:
        - button "Catalogo" [ref=e93] [cursor=pointer]:
          - generic [ref=e95]: Catalogo
          - img [ref=e96]
        - generic:
          - link "Prodotti" [ref=e98] [cursor=pointer]:
            - /url: /app/catalog/products
            - img [ref=e99]
            - generic [ref=e103]: Prodotti
          - link "Fornitori" [ref=e104] [cursor=pointer]:
            - /url: /app/catalog/suppliers
            - img [ref=e105]
            - generic [ref=e110]: Fornitori
          - link "Brand" [ref=e111] [cursor=pointer]:
            - /url: /app/catalog/brands
            - img [ref=e112]
            - generic [ref=e115]: Brand
          - link "Collezioni" [ref=e116] [cursor=pointer]:
            - /url: /app/catalog/collections
            - img [ref=e117]
            - generic [ref=e121]: Collezioni
          - link "Colori" [ref=e122] [cursor=pointer]:
            - /url: /app/catalog/colors
            - img [ref=e123]
            - generic [ref=e129]: Colori
          - link "Scale Taglie" [ref=e130] [cursor=pointer]:
            - /url: /app/catalog/size-scales
            - img [ref=e131]
            - generic [ref=e137]: Scale Taglie
          - link "Tag" [ref=e138] [cursor=pointer]:
            - /url: /app/catalog/tags
            - img [ref=e139]
            - generic [ref=e143]: Tag
      - generic [ref=e144]:
        - button "Admin" [ref=e145] [cursor=pointer]:
          - generic [ref=e147]: Admin
          - img [ref=e148]
        - generic:
          - link "Utenti" [ref=e150] [cursor=pointer]:
            - /url: /app/admin/users
            - img [ref=e151]
            - generic [ref=e163]: Utenti
          - link "Ruoli" [ref=e164] [cursor=pointer]:
            - /url: /app/admin/roles
            - img [ref=e165]
            - generic [ref=e167]: Ruoli
          - link "Negozi" [ref=e168] [cursor=pointer]:
            - /url: /app/admin/stores
            - img [ref=e169]
            - generic [ref=e173]: Negozi
      - generic [ref=e174]:
        - button "Add-on" [ref=e175] [cursor=pointer]:
          - generic [ref=e177]: Add-on
          - img [ref=e178]
        - generic:
          - button "HR Presto" [disabled] [ref=e180]:
            - img [ref=e181]
            - generic [ref=e186]: HR
            - generic [ref=e187]: Presto
          - button "Contabilità Presto" [disabled] [ref=e188]:
            - img [ref=e189]
            - generic [ref=e191]: Contabilità
            - generic [ref=e192]: Presto
          - button "Analisi Presto" [disabled] [ref=e193]:
            - img [ref=e194]
            - generic [ref=e196]: Analisi
            - generic [ref=e197]: Presto
          - button "Riunioni Presto" [disabled] [ref=e198]:
            - img [ref=e199]
            - generic [ref=e201]: Riunioni
            - generic [ref=e202]: Presto
          - button "Online Presto" [disabled] [ref=e203]:
            - img [ref=e204]
            - generic [ref=e207]: Online
            - generic [ref=e208]: Presto
  - main [ref=e209]:
    - generic [ref=e210]:
      - generic [ref=e212]: Cassa
      - generic [ref=e216]:
        - button "Vendita" [ref=e217] [cursor=pointer]:
          - img [ref=e218]
          - generic [ref=e220]: Vendita
        - button "Resi" [ref=e221] [cursor=pointer]:
          - img [ref=e222]
          - generic [ref=e225]: Resi
        - button "Clienti" [ref=e226] [cursor=pointer]:
          - img [ref=e227]
          - generic [ref=e232]: Clienti
      - generic [ref=e233]:
        - generic [ref=e234]:
          - generic [ref=e235]:
            - img [ref=e236]
            - generic [ref=e240]: Carrello
          - generic [ref=e241]:
            - img
            - textbox "Cerca SKU, prodotto, barcode..." [ref=e242]
          - generic [ref=e244]: Carrello vuoto. Cerca un prodotto per iniziare.
          - generic [ref=e245]:
            - generic [ref=e246]:
              - generic [ref=e247]: Subtotale
              - strong [ref=e248]: 0,00 €
            - generic [ref=e249]:
              - generic [ref=e250]: IVA
              - spinbutton [ref=e252]: "0"
            - generic [ref=e253]:
              - generic [ref=e254]: Sconto Ordine
              - spinbutton [ref=e256]: "0"
            - generic [ref=e257]:
              - generic [ref=e258]: Totale
              - strong [ref=e259]: 0,00 €
          - generic [ref=e261]:
            - generic [ref=e262]: Note
            - textbox "Note vendita..." [ref=e263]
        - generic [ref=e264]:
          - generic [ref=e266]: Negozio
          - combobox [ref=e268] [cursor=pointer]:
            - option "Seleziona negozio" [disabled] [selected]
            - option "Seleziona negozio"
            - option "Acme Corporation - Main Store"
          - generic [ref=e270]: Clienti
          - generic [ref=e271]:
            - textbox "Cerca clienti..." [ref=e272]
            - button "Gino Paoli gino@gmail.com" [ref=e274] [cursor=pointer]:
              - generic [ref=e275]: Gino Paoli
              - generic [ref=e276]: gino@gmail.com
          - button "Completa Vendita" [disabled] [ref=e278]:
            - img [ref=e279]
            - text: Completa Vendita
```

# Test source

```ts
  1   | /**
  2   |  * End-to-end workflow: login → nuova vendita → verifica stock/pagamento
  3   |  *
  4   |  * Copre:
  5   |  *  1. Login con credenziali admin
  6   |  *  2. Creazione vendita con prodotto reale
  7   |  *  3. Selezione negozio (abilita stock check)
  8   |  *  4. Blocco aggiunta articolo oltre stock
  9   |  *  5. Blocco "Completa Vendita" se pagamento non esatto
  10  |  *  6. Vendita completata con pagamento esatto → redirect a dettaglio
  11  |  *  7. Metodo di pagamento non-cash (GiftCard) funziona
  12  |  */
  13  | 
  14  | import { test, expect, Page } from '@playwright/test';
  15  | 
  16  | const ADMIN = { email: 'admin@acme.com', password: 'Password123!' };
  17  | 
  18  | // ─── helpers ───────────────────────────────────────────────────────────────
  19  | 
  20  | async function login(page: Page) {
  21  |   await page.goto('/login');
  22  |   await page.locator('input[type="email"], input[placeholder*="email" i]').fill(ADMIN.email);
  23  |   await page.locator('input[type="password"]').fill(ADMIN.password);
  24  |   await page.locator('input[type="password"]').press('Enter');
  25  |   await page.waitForURL('**/app**');
  26  | }
  27  | 
  28  | async function goToNewSale(page: Page) {
  29  |   // Navigate via JS click to avoid viewport issues with sidebar links
  30  |   await page.evaluate(() => {
  31  |     const link = document.querySelector<HTMLAnchorElement>('a[href="/app/pos/sales"]');
  32  |     link?.click();
  33  |   });
  34  |   await page.waitForURL('**/pos/sales**');
  35  | 
  36  |   await page.evaluate(() => {
  37  |     const btn = [...document.querySelectorAll('button')].find((b) =>
  38  |       b.textContent?.includes('Nuova Vendita'),
  39  |     ) as HTMLButtonElement | undefined;
  40  |     btn?.click();
  41  |   });
  42  |   await page.waitForURL('**/pos/sales/create**');
  43  | }
  44  | 
  45  | async function selectStore(page: Page, storeName = 'Acme Corporation - Main Store') {
  46  |   await page.locator('select').selectOption({ label: storeName });
  47  | }
  48  | 
  49  | async function searchAndAddProduct(page: Page, query: string, productText: string) {
  50  |   const searchInput = page.locator('input[placeholder="Cerca SKU, prodotto, barcode..."]');
  51  |   await searchInput.fill(query);
  52  |   await page.waitForSelector('.search-item');
  53  | 
  54  |   await page.evaluate((text) => {
  55  |     const btn = [...document.querySelectorAll<HTMLButtonElement>('.search-item')].find((b) =>
  56  |       b.textContent?.includes(text),
  57  |     );
  58  |     btn?.click();
  59  |   }, productText);
  60  | }
  61  | 
  62  | // ─── tests ─────────────────────────────────────────────────────────────────
  63  | 
  64  | test.describe('Sales workflow', () => {
  65  |   test.beforeEach(async ({ page }) => {
  66  |     await login(page);
  67  |     await goToNewSale(page);
  68  |   });
  69  | 
  70  |   test('login redirects to /app dashboard', async ({ page }) => {
  71  |     expect(page.url()).toContain('/app');
> 72  |     await expect(page.locator('h1, [class*="heading"]').first()).toBeVisible();
      |                                                                  ^ Error: expect(locator).toBeVisible() failed
  73  |   });
  74  | 
  75  |   test('nuova vendita page loads with empty cart', async ({ page }) => {
  76  |     await expect(page.locator('text=Carrello vuoto')).toBeVisible();
  77  |     // Pay button disabled when cart is empty
  78  |     const payBtn = page.locator('button:has-text("Completa Vendita"), button:has-text("Procedi al Pagamento")');
  79  |     await expect(payBtn).toBeDisabled();
  80  |   });
  81  | 
  82  |   test('selecting a store enables stock-aware product search', async ({ page }) => {
  83  |     await selectStore(page);
  84  |     const searchInput = page.locator('input[placeholder="Cerca SKU, prodotto, barcode..."]');
  85  |     await searchInput.fill('maglia');
  86  |     await page.waitForSelector('.search-item');
  87  |     // Stock badge (×N) appears in results when store is selected
  88  |     const stockBadge = page.locator('.search-item__stock').first();
  89  |     await expect(stockBadge).toBeVisible();
  90  |   });
  91  | 
  92  |   test('adding item updates cart total correctly', async ({ page }) => {
  93  |     await selectStore(page);
  94  |     // Find a product with stock ≥ 1
  95  |     await searchAndAddProduct(page, 'maglia', 'NER-MED');
  96  |     // Subtotal should be non-zero
  97  |     const subtotal = page.locator('.totals-row strong').first();
  98  |     await expect(subtotal).not.toHaveText('0,00 €');
  99  |   });
  100 | 
  101 |   test('clicking + beyond stock shows error and keeps quantity', async ({ page }) => {
  102 |     await selectStore(page);
  103 |     // Add product with stock = 1 (BLU-SMA ×1)
  104 |     await searchAndAddProduct(page, 'maglia', 'BLU-SMA');
  105 | 
  106 |     // Click + to try to exceed stock
  107 |     const plusBtns = page.locator('.qty-btn');
  108 |     await plusBtns.nth(1).click({ force: true });
  109 | 
  110 |     // Error message visible, qty still 1
  111 |     await expect(page.locator('.alert--error')).toBeVisible();
  112 |     await expect(page.locator('.qty-value')).toHaveText('1');
  113 |   });
  114 | 
  115 |   test('payment modal: underpayment disables Completa Vendita', async ({ page }) => {
  116 |     await selectStore(page);
  117 |     await searchAndAddProduct(page, 'maglia', 'NER-MED');
  118 | 
  119 |     // Open payment
  120 |     await page.evaluate(() => {
  121 |       const btn = [...document.querySelectorAll('button')].find((b) =>
  122 |         b.textContent?.includes('Pagamento'),
  123 |       ) as HTMLButtonElement;
  124 |       btn?.click();
  125 |     });
  126 |     await page.waitForSelector('.payment-row select');
  127 | 
  128 |     // Set amount to 0 (less than total)
  129 |     await page.locator('.payment-row input[type="number"]').fill('0');
  130 | 
  131 |     const completeBtn = page.locator('button:has-text("Completa Vendita")');
  132 |     await expect(completeBtn).toBeDisabled();
  133 |     // Balance indicator shows "short" state
  134 |     await expect(page.locator('.balance--short')).toBeVisible();
  135 |   });
  136 | 
  137 |   test('payment modal: overpayment disables Completa Vendita and shows error state', async ({ page }) => {
  138 |     await selectStore(page);
  139 |     await searchAndAddProduct(page, 'maglia', 'NER-MED');
  140 | 
  141 |     await page.evaluate(() => {
  142 |       const btn = [...document.querySelectorAll('button')].find((b) =>
  143 |         b.textContent?.includes('Pagamento'),
  144 |       ) as HTMLButtonElement;
  145 |       btn?.click();
  146 |     });
  147 |     await page.waitForSelector('.payment-row select');
  148 | 
  149 |     // Get the actual total and overpay
  150 |     const totalText = await page.locator('.totals-row--total strong').last().textContent();
  151 |     const total = parseFloat(totalText?.replace(/[^0-9,]/g, '').replace(',', '.') ?? '0');
  152 |     await page.locator('.payment-row input[type="number"]').fill(String(total + 50));
  153 | 
  154 |     const completeBtn = page.locator('button:has-text("Completa Vendita")');
  155 |     await expect(completeBtn).toBeDisabled();
  156 |     // Over state shown
  157 |     await expect(page.locator('.balance--over')).toBeVisible();
  158 |   });
  159 | 
  160 |   test('payment modal: exact payment enables Completa Vendita and shows OK state', async ({ page }) => {
  161 |     await selectStore(page);
  162 |     await searchAndAddProduct(page, 'maglia', 'NER-MED');
  163 | 
  164 |     await page.evaluate(() => {
  165 |       const btn = [...document.querySelectorAll('button')].find((b) =>
  166 |         b.textContent?.includes('Pagamento'),
  167 |       ) as HTMLButtonElement;
  168 |       btn?.click();
  169 |     });
  170 |     await page.waitForSelector('.payment-row select');
  171 | 
  172 |     // The amount is pre-filled with the exact total by openPayment()
```