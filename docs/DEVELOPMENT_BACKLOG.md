# RMS Development Backlog

**Last Updated:** 2026-03-26
**Status:** Active Development (3 new items in staged commit)

---

## Bugs & Issues

### Warehouse UI Issues
- [x] **Remove "New Product / Order" from warehouse section**
  - Location: Warehouse section + home page widget
  - Details: Wizard is available via Purchase Orders → +New Order; remove duplicate entry point
  - Impact: UI cleanup, reduce confusion
  - **Fixed:** March 25, 2026 — removed from `src/config/navigation.ts`

- [x] **Fix "+ New Order" button display**
  - Location: Warehouse section
  - Details: Button shows "+" twice (icon + text); keep icon only
  - Impact: UI polish
  - **Fixed:** March 25, 2026 — removed leading "+" from locale strings

### Navigation Issues
- [x] **Breadcrumb links from warehouse submenus**
  - Location: Warehouse submenus (e.g., products, orders, inventory)
  - Details: Breadcrumb only links to homepage; cannot navigate back to warehouse parent
  - Impact: User navigation flow broken
  - **Fixed:** March 25, 2026 — section crumb now carries `hubRoute: 'admin-hub'` for navigation back to parent

---

## Recently Fixed (Hotfixes)

### Icon & Routing Fixes
- [x] **Icon — Boxes instead of BoxesStacked**
  - Location: `src/config/navigation.ts:55`
  - Details: Changed icon from `BoxesStacked` to `Boxes` for better semantic match
  - **Fixed:** March 25, 2026

- [x] **Route ordering — prevent UUID misinterpretation**
  - Location: `rms-backend/src/modules/inventory/inventory.controller.ts`
  - Details: Reordered routes so specific `stock/store/:storeId/low` and `stock/store/:storeId` come before generic `stock/:variantId/:storeId`. Prevents NestJS from incorrectly binding "store" as a variantId UUID.
  - **Fixed:** March 25, 2026

---

## Backend Enhancements (In Progress)

### Multi-Tenancy Enforcement
- [x] **Add tenant_id to product_variants table**
  - Location: `rms-backend` (commit: 73b3a73)
  - Details: Added `tenant_id` UUID column to product_variants for enforcing multi-tenancy at data level. Includes backfill logic from parent products.
  - Impact: Ensures product variants are properly scoped to tenant, preventing cross-tenant data leakage
  - Docker integration: Added `db-init` service in docker-compose.yml for safe schema migration with conditional logic
  - **Implemented:** March 26, 2026
    - Backend: `feat: add tenant_id to product variants for multi-tenancy enforcement`
    - Docker: Added db-init service with idempotent migration (ADD COLUMN IF NOT EXISTS, conditional NOT NULL constraint)

---

## Features (To Be Developed)

### PO Returns Feature
- [ ] **Implement PO returns logic**
  - Details: Full feature including return processing, impact on inventory/stock
  - Impact: Stock management, inventory tables
  - Complexity: High (affects multiple tables + stock calculations)

### Cash Operations Wizard
- [ ] **Implement cash operations wizard**
  - Details: Client creation/selection popup, return handling, stock impact calculations
  - Includes: Client selection modal, client creation inline, return item selection
  - Impact: Stock management, financial tracking
  - Complexity: High (multi-step workflow + stock updates)

### Catalogue Section (New)
- [x] **Create new "Catalogue" section widget on home page**
  - Details: Move items from Warehouse to new Catalogue section
  - Items to move:
    - Products
    - Suppliers
    - Brands
    - Collections
    - Colors
    - Size Scales
    - Tags
  - Requirements:
    - [x] Assign section color — #10B981 Emerald green
    - [x] Update navigation config (`src/config/navigation.ts`)
    - [x] Update section styling/accents (`src/styles/main.scss`)
    - [x] Update related routes and permissions (`src/router/index.ts`)
  - **Fixed:** March 25, 2026 — Full implementation complete:
    - `CatalogoView.vue` (new hub page) displays all 7 catalog items
    - `src/config/navigation.ts`: New `catalogo` section with 7 items and `hubRoute: 'tenant-catalogo'`
    - `src/styles/main.scss`: Added `.section-catalogo` styling with #10B981 (emerald)
    - `src/router/index.ts`: 9 routes updated from `'magazzino'` → `'catalogo'` meta; added `tenant-catalogo` route
    - `MagazzinoView.vue`: Simplified to render only 4 operational items (POs, Inventory, Stock Movements)
    - Sidebar cleanup: Removed nested catalog expander and special-case code from `TheSidebar.vue`

### Admin "Explore" Button
- [x] **Update Admin "Explore" button behavior**
  - Current: Links directly to users management
  - Target: Opens full admin section (like magazzino does)
  - Impact: Consistent navigation patterns
  - Complexity: Low
  - **Fixed:** March 25, 2026 — Full implementation complete:
    - `src/config/navigation.ts`: Added `hubRoute: 'tenant-admin-hub'` to tenant admin section
    - `src/router/index.ts`: Added `tenant-admin-hub` route
    - `TenantAdminHubView.vue` (new hub page): Displays Users, Roles, and Stores with consistent navigation pattern

---

## E2E Checks

### PO Flow End-to-End Testing
- [ ] **Product/variant creation with multiple color groups**
  - Details: Verify ability to create products and variants with multiple color groups simultaneously
  - Scope: Product creation → PO wizard → Inventory
  - Status: Pending

- [ ] **Component input validation**
  - Details: All component inputs work correctly (size scale, supplier, brand, etc.)
  - Scope: PO wizard, product creation, supplier creation
  - Status: Pending

- [ ] **Component creation from PO wizard**
  - Details: Verify all component creation flows (products, suppliers, brands, etc.) triggered from PO creation respect backend setup
  - Scope: Full PO wizard flow
  - Status: Pending

- [x] **Popup view reusability in Catalogue section**
  - Details: Ensure same popup/modal components used across PO wizard AND Catalogue section (no code duplication)
  - Process consistency: All component creation follows identical UX patterns
  - **Fixed:** March 25, 2026 — Extracted 5 shared form-fields components (`BrandFormFields`, `ColorFormFields`, `CollectionFormFields`, `SupplierFormFields`, `SizeScaleFormFields`) into `src/components/app/catalog/forms/`. All 5 inline creation modals (PO wizard) and all 5 catalogue CRUD views now use the shared components via `v-model`. `SizeScaleFormFields` uses `showSizeTable` prop to split inline creation (PO wizard) from name/description-only creation (catalogue, which keeps its separate "Manage Sizes" modal).
  - Test coverage: All CRUD operations in both sections

### Permission Management & UI Visibility
- [ ] **Frontend permission enforcement & dynamic UI visibility**
  - Details: Validate that tenant users only see and can access UI elements matching their assigned permissions
  - Scope:
    - [ ] Tenant users can only view modules/sections they have access to
    - [ ] Tenant users can only perform actions (edit, create, delete) if they have explicit permission
    - [ ] Admin/SuperAdmin store visibility assignments properly restrict scope
    - [ ] UI dynamically changes based on user role and assigned permissions (buttons hidden, sections disabled, etc.)
  - Test scenarios:
    - Different role levels (viewer, editor, admin) see different UI
    - Permission-denied actions gracefully fail with user feedback
    - Navigation menu updates based on accessible modules
    - Section-level and module-level permission filtering
  - Status: Pending
  - Complexity: Medium (involves auth state, permission store, component visibility)

- [ ] **Homepage widgets & subsection-level permission filtering**
  - Details: Validate that homepage widgets dynamically filter content at both section level (admin, magazzino, cassa, add-ons) AND subsection level (products, purchase orders, suppliers, inventory, sell, customers, users, roles, etc.)
  - Scope:
    - [ ] Section-level filtering: Users only see section widgets they have access to
    - [ ] Subsection-level filtering: Within each section, only accessible subsection items are shown
    - [ ] Section colors and styling respect permission-based visibility
    - [ ] Widget content updates dynamically as permissions change
  - Test scenarios:
    - User with limited "magazzino" permissions sees only accessible subsections (e.g., products but not inventory)
    - User without "cassa" access sees no cassa widget or section
    - Admin/SuperAdmin see all sections and subsections
    - Store-level visibility assignments properly filter subsection access
  - Status: Pending
  - Complexity: Medium (involves permission store state, widget rendering, dynamic content filtering)

- [ ] **Tenant isolation in product variants (multi-tenancy enforcement)**
  - Details: Verify that product variants are properly isolated by tenant_id at the database and API level
  - Scope:
    - [ ] Product variants correctly associated with parent product's tenant_id
    - [ ] API endpoints enforce tenant_id filtering (cannot access variants from other tenants)
    - [ ] PO wizard can only see variants for products in the user's tenant
    - [ ] Inventory/stock operations properly scoped by variant tenant_id
    - [ ] db-init migration runs successfully and backfills existing data correctly
  - Test scenarios:
    - Create products in Tenant A, Tenant B; verify variants are isolated
    - Non-SuperAdmin users cannot query/modify variants outside their tenant
    - PO creation from Tenant A only sees variants from Tenant A's products
    - Migration idempotency: running migration twice should not cause issues
  - Status: Pending
  - Complexity: Medium (touches database, API filtering, data isolation)

---

## Development Notes

- **Multi-tenancy enforcement** is now database-level with tenant_id on product_variants; API filtering must be verified
- **Stock impact calculations** are critical for Returns and Cash Operations features
- **Component popup reusability** has been verified (Catalogue section is complete, shared form components extracted)

---

## Progress Summary

| Category | Total | Completed | In Progress | Pending |
|----------|-------|-----------|-------------|---------|
| Bugs/Issues | 3 | 3 | 0 | 0 |
| Features | 4 | 2 | 0 | 2 |
| Hotfixes | 2 | 2 | 0 | 0 |
| Backend Enhancements | 1 | 1 | 0 | 0 |
| E2E Checks | 7 | 1 | 0 | 6 |
| **TOTAL** | **17** | **9** | **0** | **8** |
