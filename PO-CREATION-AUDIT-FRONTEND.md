# PO Creation Module — Frontend Audit Report

## Executive Summary

The unified PO flow is architecturally solid (draft → committed → recap, clean immutable updates, good keyboard nav in the matrix), but it currently has **silent hard failures on realistic inputs** — a cost of 10.55€ with the default ×2.5 markup cannot be committed at all, and the user gets zero feedback.

**6 bugs confirmed live** against the running app, traced to exact lines, with frontend/backend DTO field alignment verified (fields match; number formats don't).

---

## Methodology

- Two Haiku explorers mapped the codebase
- Read key files:
  - `PurchaseOrderCreateView.vue`
  - `ProductDraftBlock.vue`
  - `CommittedProductBlock.vue`
  - `purchaseOrderPricing.ts`
  - Backend DTOs
- Drove the real flow at 1920×1080 via Playwright with network capture
- Screenshots saved as `audit-01…06.png` in repo root

**Note:** Test data left in dev DB:
- Order: `PO-2026-0004`
- Product: "Zaffiro Audit Prodotto"
- Color: "Verdazzurro"

---

## 🐛 Bugs (All Reproduced Live)

### 1. Unrounded Floats Rejected by Backend with 400 (Silent)

**Location:** `PurchaseOrderCreateView.vue:212`

Backend DTOs enforce `@IsNumber({ maxDecimalPlaces: 2 })` on `sellingPrice`, `costPrice`, `markupMultiplier`. The frontend sends raw floats.

**Example:**
- Cost 10.55 × markup 2.5 → 26.375
- Backend rejects with 400: `"variants.0.sellingPrice must be a number conforming to the specified constraints"`
- UI shows nothing: error div only renders `ordersStore.error`, but product creation fails into `productsStore.error` (never displayed)
- Draft stays open, button does nothing

**Related:** `markupFromSell()` in `purchaseOrderPricing.ts:14` back-solves 25.99 / 10 = 2.5989999999999998 — raw float both displayed in markup input and sent as `items[].markupMultiplier` → live 400 on order submit.

**Fix:** Single `round2()` applied at payload boundary and in `sell()` display.

---

### 2. Same-Tick Updates Lose Data (Emit-Whole-Draft Pattern Races)

**Location:** ProductDraftBlock component state handlers

Every handler rebuilds state from `props.draft`/`props.modelValue`, which doesn't update until the next render.

**Example:**
- Set name + brand + gender + scale in one tick
- Only the last survived ("Mancano: Nome prodotto, Brand, Genere" with scale set)
- In OrderSettingsTab: supplier + store pair had the same issue
- DOM kept showing "Kaos s.p.a." while actual state was `''`
- Submit then failed with "supplierId must be a UUID" while select visibly showed a supplier

**Trigger:** Browser autofill and fast type-then-tab both hit this path.

**Fix:** Debounce emit or use `v-model` proxy with intermediate state.

---

### 3. Auto-SKU Collisions → Swallowed 409

**Location:** `buildAutoSku()` in `PurchaseOrderCreateView.vue:161`

Uses `name[0:3]-color[0:3]-size[0:3]` pattern.

**Example:**
- "Test Audit Prodotto" collided with old test product
- 409 error: `"SKUs already exist: TES-NER-XXS"`
- Zero UI feedback
- User cannot see or edit generated SKUs anywhere in the flow

**Fix:** Display generated SKU with conflict warning; allow manual override in the draft form.

---

### 4. Hard Refresh / Deep Link on Create Page Bounces to Dashboard

**Location:** `main.ts:18` + vue-router permission guard

Vue-router starts initial navigation at `app.use(router)`, but `main.ts:18` only awaits `authStore.init()` before `mount()` — permission guard runs with empty `userPermissions` and redirects.

**Example:**
- Direct navigation to `/app/warehouse/purchase-orders/create` lands on `/app`
- Any in-progress order is lost on refresh
- (Main.ts comment claims the opposite)

**Fix:** Ensure permission check happens **after** auth + permissions are fully loaded.

---

### 5. Falsy-Zero || undefined Inverts Explicit User Intent

**Location:** `PurchaseOrderCreateView.vue:351-364`

Per-color `discountPercent: c.discount || undefined` — a color explicitly set to 0% discount gets `undefined`, and per backend DTO comment falls back to PO-level discount.

Same for markup 0 and `taxRate: taxRatePercent / 100 || undefined` (IVA set to 0% → backend default applies).

**Fix:** Use `?? undefined` semantics with explicit 0 passthrough.

```javascript
// Before (bad)
discountPercent: c.discount || undefined

// After (correct)
discountPercent: c.discount ?? undefined
```

---

### 6. Inline Color Creation Is a Dead End

**Location:** `ProductDraftBlock.vue:947`

`@created="showColorModal = false"` — the searched name is never passed (the `initialName` prop exists but `colorModalSearch` is never bound).

**Example:**
- Modal opens empty after search
- After saving, color is not selected
- Verified live: no chip, user must re-find it in dropdown

**Fix:** Bind `colorModalSearch` to `initialName` prop and auto-select created color.

---

## 💡 Improvement Suggestions

### 1. Render Product/Draft Errors Where the User Is Looking

Map `productsStore.error` + backend validation messages into the draft footer (the "Mancano: …" slot is perfect for it).

- i18n'd and human-readable ("Il prezzo di vendita può avere max 2 decimali")
- Not raw JSON arrays like `[ "supplierId must be a UUID", … ]`

### 2. Gate Submit on Order Prerequisites

"Crea Ordine di Acquisto" is enabled with no supplier/store.

- Disable with inline "Mancano: Fornitore, Negozio" hint in recap
- Mirror the draft-footer pattern

### 3. Make the Two-Column Draft Form Actually Reachable

Container query needs ≥1100px but items column is 1060px at 1920×1080 with panel open — most common desktop sees single 781px-wide column, matrix sits ~2 screens down.

**Fix:** Drop breakpoint to ~900px (fields comfortably fit 520px each per column) so name→matrix fits one screen.

### 4. Don't Silently Reset Hand-Tuned Sconto/Ricarico on Supplier Change

Currently `onSettingsUpdate` reapplies supplier defaults without warning.

**Options:**
- Only apply supplier defaults if user hasn't touched the fields
- Show small "applicati default fornitore" toast with undo

### 5. Tighten the Color-Group Loop

- Dropdown still lists already-selected colors
- "+" icon next to search duplicates the in-dropdown "Crea Colore" affordance
- Selecting a color should clear the search
- Enter on single match should add it to pending tray

**Today:** One-color group needs 4 interactions → **Can be 2**

---

## 🧹 Code Cleanups

### 1. Extract Duplicated Variant-Resolution Block

**Location:** `onDraftCommit` in `PurchaseOrderCreateView.vue`

Lines 180–195 (existing-product path) and lines 239–254 (create path) contain identical:
```javascript
colors.map(... find variant by colorIds+sizeId ...)
```

**Fix:** Extract to `resolveVariantIds(product, fullProduct)` helper.

### 2. Dead Draft State

`colorSearch` and `builderColorIds` in `ProductDraft` are never read (ColorGroupBuilder keeps its own state).
`colorModalSearch` is set but never forwarded.

**Fix:** Remove or wire them (wiring `colorModalSearch` also fixes bug 6).

### 3. Share the Gender List

`GENDERS` is hardcoded in:
- `ProductDraftBlock.vue:476`
- `CommittedProductBlock.vue:380`

**Fix:** Derive single exported constant from `ProductGender` type so it can't drift from backend enum.

### 4. One Numeric-Input Helper + Consistent Clamping

`parseFloat`/`parseInt` + `Math.max` re-implemented ~10 places.
`CommittedProductBlock.onCostInput:120` misses 0-clamp (typing negative cost → backend `Min(0)` 400).

**Fix:** Single `parseMoney(raw, {min, max})` util:
- Provides rounding point for bug 1
- Ensures consistent clamping

**Bonus:** Five inline modals share identical scaffolding — a `useInlineCreateModal` composable would give them the error display they all lack.

---

## 🔧 Must Add / Rework

### 1. Rework When Products Are Actually Created

**Current:** "Aggiungi all'ordine" immediately POSTs product to catalog.

**Consequences (verified):**
- Abandoning order leaves orphan products
- Edits on committed card (name/gender/tags/cost) never persisted — catalog keeps originals, PO shows edits
- Sizes left at 0 are dropped at commit, matrix can never reopen to add them

**Options:**
1. Defer all product creation to order submit (one atomic operation, ideally backend endpoint creating products+PO transactionally)
2. Sync committed-block edits with PATCH/DELETE

This is the **biggest correctness/UX debt** in the module.

### 2. Draft Persistence ("Salva Bozza")

**Current:** Entire order lives in component refs.

**Risk:**
- Refresh (bug 4 makes destructive)
- Misclick on back
- Auth hiccup
- Wipes 20 minutes of data entry

**Fix:**
- Domain already has Draft PO status
- Add "save as draft" + restore-on-mount
- localStorage at minimum, backend draft ideally
- Confirm dialog on discarding non-empty draft

---

## ✅ Field Alignment Verification

**Status:** All fields match 1:1 between frontend and backend

| Field | Notes |
|-------|-------|
| `supplierId` | ✓ |
| `storeId` | ✓ |
| `poNumber` | ✓ |
| `expectedDeliveryDate` | ✓ |
| `discountPercent` | ✓ |
| `markupMultiplier` | ✓ |
| `taxRate` | ✓ |
| `shippingAmount` | ✓ |
| `notes` | ✓ |
| `items[].variantId` | ✓ |
| `items[].quantityOrdered` | ✓ |
| `items[].costPriceAtOrder` | ✓ |
| `items[].discountPercent` | ✓ |
| `items[].markupMultiplier` | ✓ |

**Mismatches are purely value formats** (decimal places, falsy-zero handling) — all fixes keep the field set intact.

---

**Generated:** June 2026
**Test Data:** Available in dev DB (order PO-2026-0004)
