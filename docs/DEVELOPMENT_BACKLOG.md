# RMS Development Backlog

**Last Updated:** 2026-03-25
**Status:** Active Development

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
- [ ] **Create new "Catalogue" section widget on home page**
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
    - [ ] Assign section color (to be determined)
    - [ ] Update navigation config (`src/config/navigation.ts`)
    - [ ] Update section styling/accents
    - [ ] Update related routes and permissions
  - Impact: Information architecture redesign
  - Complexity: High (affects navigation, routing, styling)

### Admin "Explore" Button
- [ ] **Update Admin "Explore" button behavior**
  - Current: Links directly to users management
  - Target: Opens full admin section (like magazzino does)
  - Impact: Consistent navigation patterns
  - Complexity: Low

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

- [ ] **Popup view reusability in Catalogue section**
  - Details: Ensure same popup/modal components used across PO wizard AND Catalogue section (no code duplication)
  - Process consistency: All component creation follows identical UX patterns
  - Status: Pending (depends on Catalogue section feature)
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

---

## Development Notes

- **Warehouse section items** should eventually move to Catalogue (see Features)
- **Stock impact calculations** are critical for Returns and Cash Operations features
- **Component popup reusability** should be verified after Catalogue section build
- **Color assignment for Catalogue** section needs design approval

---

## Progress Summary

| Category | Total | Completed | In Progress | Pending |
|----------|-------|-----------|-------------|---------|
| Bugs/Issues | 3 | 3 | 0 | 0 |
| Features | 4 | 0 | 0 | 4 |
| E2E Checks | 5 | 0 | 0 | 5 |
| **TOTAL** | **12** | **3** | **0** | **9** |
