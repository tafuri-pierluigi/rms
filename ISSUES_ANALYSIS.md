# RMS - Analisi Completa Problemi e Criticità

> Documento aggiornato: 12 Febbraio 2026
> Versione: 2.0 (Business Modules + Bug Fixes)
> Status: Aggiornato - 5 Business Modules Frontend + Multiple Bug Fixes

---

## Indice

1. [Executive Summary](#executive-summary)
2. [Fix Completati](#fix-completati)
3. [Risultati Test Endpoint (22/01/2026)](#risultati-test-endpoint)
4. [Problemi Noti (problemi.txt)](#problemi-noti)
5. [Vulnerabilità di Sicurezza](#vulnerabilità-di-sicurezza)
6. [Bug Backend](#bug-backend)
7. [Bug Frontend](#bug-frontend)
8. [Problemi Infrastruttura](#problemi-infrastruttura)
9. [Incongruenze Frontend-Backend](#incongruenze-frontend-backend)
10. [Problemi di UX](#problemi-di-ux)
11. [Debito Tecnico](#debito-tecnico)
12. [Piano di Remediation](#piano-di-remediation)

---

## Executive Summary

### Statistiche Problemi

| Severità | Conteggio | Risolti | Rimanenti |
|----------|-----------|---------|-----------|
| 🔴 CRITICAL | 14 | 13 | 1 |
| 🟠 HIGH | 20 | 14 | 6 |
| 🟡 MEDIUM | 24 | 5 | 19 |
| 🟢 LOW | 13 | 1 | 12 |

### Top 5 Priorità Assolute

1. ~~**Permissions `stores:*` mancanti nel DB**~~ ✅ RISOLTO
2. ~~**CORS permissivo** (`origin: true`)~~ ✅ RISOLTO
3. **HTTPS/SSL mancante** - Credenziali in chiaro
4. ~~**PermissionsGuard non funziona correttamente**~~ ✅ RISOLTO
5. ~~**Endpoint `/stores/:id/users` mancante**~~ ✅ RISOLTO
6. ~~**Sistema Permessi Frontend Mancante (EVO-001)**~~ ✅ RISOLTO (26 Gennaio)
7. ~~**TenantId Protection (Interceptor)**~~ ✅ RISOLTO (26 Gennaio)
8. ~~**User/Tenant Inactive Login Validation**~~ ✅ RISOLTO (26 Gennaio)
9. ~~**Token Refresh Loop Infinito (FE-001)**~~ ✅ RISOLTO (26 Gennaio)
10. ~~**Permissions 403 Admin (BUG-002)**~~ ✅ RISOLTO (26 Gennaio)

---

## Fix Completati

> Sessione di fix del 22/01/2026

### ✅ FIX-001: Permissions stores:* e PermissionsGuard
- **Issue:** TEST-001, TEST-002, TEST-003
- **Causa Root:** Database conteneva seed vecchio, mancavano permissions stores:*
- **Soluzione:** Reset DB + rebuild per applicare seed corretto
- **File:** `rms-backend/src/database/seeds/seed.service.ts` (già corretto)
- **Verifica:**
  ```sql
  SELECT name FROM permissions WHERE resource = 'stores';
  -- stores:create, stores:read, stores:update, stores:delete ✓
  ```

### ✅ FIX-002: Password Hash Esposta nelle Risposte API
- **Issue:** TEST-006, SEC-xxx
- **Soluzione:**
  - Aggiunto `@Exclude()` decorator al campo password in User entity
  - Aggiunto `ClassSerializerInterceptor` globale in main.ts
- **File Modificati:**
  - `rms-backend/src/users/entities/user.entity.ts`
  - `rms-backend/src/main.ts`
- **Verifica:** GET /users, GET /stores non contengono più campo password

### ✅ FIX-003: Endpoint GET /auth/me Mancante
- **Issue:** TEST-004
- **Soluzione:** Aggiunto endpoint GET /auth/me
- **File Modificati:**
  - `rms-backend/src/auth/auth.controller.ts`
  - `rms-backend/src/auth/auth.service.ts`
- **Verifica:** `curl /auth/me` → 200 con dati utente completi

### ✅ FIX-004: Endpoint POST/DELETE /stores/:id/users
- **Issue:** BUG-001, INC-003
- **Soluzione:** Implementati endpoint per gestione utenti-store
- **File Modificati:**
  - `rms-backend/src/stores/stores.controller.ts`
  - `rms-backend/src/stores/stores.service.ts`
  - `rms-backend/src/stores/stores.module.ts`
  - Nuovo: `rms-backend/src/stores/dto/add-user-to-store.dto.ts`
- **Verifica:**
  - `DELETE /stores/:id/users/:userId` → 200
  - `POST /stores/:id/users` con `{"userId":"..."}` → 201

### ✅ FIX-005: CORS Whitelist
- **Issue:** SEC-001
- **Soluzione:** Sostituito `origin: true` con whitelist configurabile
- **File:** `rms-backend/src/main.ts`
- **Configurazione:** `CORS_ORIGINS` env var (default: `http://localhost:5173,http://localhost`)
- **Nota:** Supporta origini multiple separate da virgola

### ✅ FIX-006: Update Parziale Utenti (Campi Null)
- **Issue:** TEST-005
- **Problema:** `PATCH /users/:id` sovrascriveva campi non inviati con null
- **Soluzione:** Filtro campi undefined prima di Object.assign
- **File:** `rms-backend/src/users/users.service.ts`
- **Verifica:** `PATCH {"firstName":"Test"}` non modifica `lastName`

### ✅ FIX-007: Centralizzazione isSuperAdmin
- **Issue:** BE-004
- **Problema:** Funzione `isSuperAdmin` duplicata in 5 controller/service
- **Soluzione:** Creato `src/common/utils/auth.utils.ts` con funzioni centralizzate
- **File Creato:** `rms-backend/src/common/utils/auth.utils.ts`
- **File Aggiornati:**
  - `stores.controller.ts`
  - `users.controller.ts`
  - `users.service.ts`
  - `roles.controller.ts`
  - `permissions.controller.ts`
- **Funzioni esportate:**
  - `isSuperAdmin(user)` - verifica se utente è SuperAdmin
  - `canAccessTenant(user, tenantId)` - verifica accesso a tenant
  - `PROTECTED_ROLES` - costante ruoli protetti

### ✅ FIX-008: TenantBodyInterceptor - Multi-Tenant Context Protection
- **Issue:** SEC-003 (EVO-001 - Tenant Context Management)
- **Problema:** Non-SuperAdmin poteva cambiare tenantId in PATCH/POST requests via body
- **Causa Root:** Mancava centralizzazione della protezione tenantId tra controller/service
- **Soluzione:**
  - Nuovo `TenantBodyInterceptor` che rimuove tenantId da body per non-SuperAdmin
  - Service methods proteggono tenantId durante update se undefined
  - SuperAdmin può comunque cambiare tenantId esplicitamente
- **File Creato:** `rms-backend/src/common/interceptors/tenant-body.interceptor.ts`
- **File Modificati:**
  - `src/app.module.ts` - Registrato APP_INTERCEPTOR
  - `src/stores/stores.service.ts:update()` - Protection logic
  - `src/users/users.service.ts:update()` - Protection logic
  - `src/stores/dto/update-store.dto.ts` - Aggiunto tenantId field
- **Execution Flow:**
  ```
  Request → Guards (set request.tenantId)
         → TenantBodyInterceptor (strip tenantId for non-SA)
         → DTO Validation
         → Controller → Service (check if tenantId !== undefined)
  ```
- **Test Results (26/01/2026):**
  - Admin updates store with foreign tenantId → tenantId preserved ✓
  - SuperAdmin updates store with new tenantId → tenantId changed ✓
  - User attempts create with tenantId → 403 Forbidden ✓

### ✅ FIX-009: Sistema Permessi Dinamici Frontend (EVO-001)
- **Issue:** FE-001, FE-002 (Permission-based UI controls)
- **Problema:** Frontend non aveva permessi disponibili, UI basata solo su ruoli hardcoded
- **Soluzione (Hybrid Pattern):**
  - JWT contiene solo `roles` (leggero)
  - `/auth/me` ritorna flattened `permissions: string[]`
  - Frontend store cache in memoria con O(1) lookup
- **File Creato:**
  - `rms-frontend/src/api/auth.api.ts:getMe()`
- **File Modificati:**
  - `src/stores/auth.store.ts` - Aggiunto:
    - `userPermissions: ref<string[]>`
    - `hasPermission()` helper
    - `hasAnyPermission()` helper
    - `hasAllPermissions()` helper
    - `fetchUserDetails()` action
    - Call in `setTokens()`, `init()`, `logout()`
  - `src/router/index.ts` - Aggiunto:
    - `requiresPermissions` e `requiresPermissionsMode` meta fields
    - Navigation guard che verifica permissions
  - `src/types/user.types.ts` - Aggiunto `permissions?: string[]`
  - `src/components/app/AppSidebar.vue` - Dynamic menu via `hasPermission()`
  - `src/views/StoresView.vue` - Action icons with permission checks
  - `src/views/UsersView.vue` - Action icons with permission checks
  - `src/views/RolesView.vue` - Action icons with permission checks
  - Rimosso: "Manage Users" modal da StoresView (feature solo da User form)
- **Backend Changes for Frontend:**
  - `src/auth/auth.service.ts:getMe()` - Ritorna flattened permissions
  - `src/database/seeds/seed.service.ts` - USER role con 0 permessi
- **Test Results (26/01/2026):**
  - SuperAdmin login → 20 permissions ✓
  - Admin login → 11 permissions ✓
  - User login → 0 permissions ✓
  - Sidebar dinamica in base a hasPermission() ✓
  - Action button visibility controllata ✓
  - Router guard su requiresPermissions ✓

### ✅ FIX-010: User & Tenant Inactive Login Validation
- **Issue:** BUG-002 (new), Security: inactive users could login
- **Problema:** Backend non controllava `isActive` al login - utenti disattivati potevano accedere
- **Soluzione:** Aggiunto controllo in auth.service.ts:login()
- **File Modificati:**
  - `rms-backend/src/auth/auth.service.ts:50-56` - Aggiunto controllo `user.isActive` e `tenant.isActive`
- **Test Results (26/01/2026):**
  - Active user login → ✓ Success
  - Inactive user login → ✓ 401 "User account is inactive"
  - Tenant inactive login → ✓ 401 "Tenant is inactive"

### ✅ FIX-011: Login Error Handling & Axios Auth Skip
- **Issue:** FE-001, FE-003 (parte di)
- **Problema:**
  - Login fallisce → axios interceptor redirecta automaticamente (hard refresh)
  - Errore di login non visibile all'utente
- **Soluzione:**
  - Aggiunto skip per `/auth/*` endpoints in axios interceptor
  - Migliorato error message extraction dal backend
- **File Modificati:**
  - `rms-frontend/src/api/axios.ts:28-32` - Aggiunto isAuthRequest check
  - `rms-frontend/src/stores/auth.store.ts:145-153` - Migliorato error extraction
  - `rms-frontend/src/views/LoginView.vue` - Aggiunto error alert
  - `rms-frontend/src/views/app/AppLoginView.vue` - Aggiunto error alert
- **Test Results (26/01/2026):**
  - Invalid credentials → ✓ Error visibile in UI
  - User inactive → ✓ "User account is inactive" in UI
  - Tenant inactive → ✓ "Tenant is inactive" in UI

### ✅ FIX-012: UI Layout Refactor - Fixed Header & Push Sidebar
- **Issue:** FIX-UI-001, UX improvements
- **Problema:**
  - Header non fisso, scrollava via
  - Sidebar copriva il contenuto (non lo spingeva)
  - Sidebar-brand non necessario
- **Soluzione:**
  - Header position: fixed (z-index 99)
  - Sidebar spinge contenuto (margin-left quando open)
  - Rimosso sidebar-brand da entrambe le interfacce
  - Rinominato `components/layout/` → `components/admin/` per clarità
- **File Modificati:**
  - `components/app/AppLayout.vue` - Fixed header, push sidebar
  - `components/app/AppHeader.vue` - Position fixed
  - `components/app/AppSidebar.vue` - Rimosso brand, push content
  - `components/admin/AppLayout.vue` - Same layout fixes
  - `components/admin/AppHeader.vue` - Position fixed
  - `components/admin/AppSidebar.vue` - Rimosso brand
  - `router/index.ts` - Import update per admin folder
- **Test Results (26/01/2026):**
  - Header rimane fisso durante scroll ✓
  - Sidebar open → contenuto spinto a destra ✓
  - Sidebar close → contenuto prende larghezza piena ✓
  - Nessun sidebar-brand in entrambe le aree ✓

> Sessione di fix del 12/02/2026 - Business Modules + Bug Fixes

### ✅ FIX-013: Frontend Views per 5 Moduli Business
- **Issue:** Feature - Mancavano completamente le viste frontend per i moduli business
- **Soluzione:** Implementate viste complete per Suppliers, Catalog (Brands, Colors, Tags, Size Scales, Collections), Products, Purchase Orders, Inventory
- **Files Creati (per modulo):**
  - **Types:** `supplier.types.ts`, `catalog.types.ts`, `product.types.ts`, `purchase-order.types.ts`, `inventory.types.ts`
  - **API:** `suppliers.api.ts`, `catalog.api.ts`, `products.api.ts`, `purchase-orders.api.ts`, `inventory.api.ts`
  - **Stores:** `suppliers.store.ts`, `catalog.store.ts`, `products.store.ts`, `purchase-orders.store.ts`, `inventory.store.ts`
  - **Views:** `SuppliersView.vue`, `SupplierDetailView.vue`, `BrandsView.vue`, `ColorsView.vue`, `TagsView.vue`, `SizeScalesView.vue`, `CollectionsView.vue`, `ProductsView.vue`, `ProductDetailView.vue`, `PurchaseOrdersView.vue`, `PurchaseOrderDetailView.vue`, `InventoryView.vue`, `StockMovementsView.vue`
- **Files Modificati:**
  - `src/types/index.ts`, `src/api/index.ts`, `src/stores/index.ts` - Barrel exports
  - `src/router/index.ts` - Rotte per tutte le nuove viste
  - `src/components/app/AppSidebar.vue` - Menu con sezione Catalog collapsible

### ✅ FIX-014: isActive in Create Payloads (5 viste)
- **Issue:** BUG - Backend CreateDtos non accettano `isActive`, frontend lo inviava causando errori di validazione
- **Causa Root:** `whitelist: true` in NestJS validation pipe rifiuta proprietà non presenti nel DTO
- **Soluzione:** Destructuring `const { isActive, ...createData } = formData.value` prima dell'invio
- **File Modificati:**
  - `rms-frontend/src/views/app/catalog/BrandsView.vue`
  - `rms-frontend/src/views/app/catalog/ColorsView.vue`
  - `rms-frontend/src/views/app/catalog/SizeScalesView.vue`
  - `rms-frontend/src/views/app/catalog/CollectionsView.vue`
  - `rms-frontend/src/views/app/ProductsView.vue`

### ✅ FIX-015: TypeORM Transaction/FindOne Isolation Bug
- **Issue:** 🔴 CRITICAL - Purchase order creation returned 404 "not found" after successful creation
- **Causa Root:** `this.findOne()` chiamato dentro `dataSource.transaction()` usa il repository di default (fuori transazione), che non vede i dati uncommitted
- **Soluzione:** Restituire l'ID dalla transazione e chiamare `findOne()` dopo il commit
- **File Modificati:**
  - `rms-backend/src/purchase-orders/purchase-orders.service.ts` (5 metodi: create, addItem, updateItem, removeItem, receiveItems)
  - `rms-backend/src/products/products.service.ts` (4 metodi: create, update, addVariant, updateVariant)
- **Pattern:**
  ```typescript
  // PRIMA (broken)
  return await this.dataSource.transaction(async (manager) => {
    await manager.save(entity);
    return this.findOne(id); // NON vede dati uncommitted!
  });
  // DOPO (fixed)
  const savedId = await this.dataSource.transaction(async (manager) => {
    const saved = await manager.save(entity);
    return saved.id;
  });
  return this.findOne(savedId); // Vede dati committed ✓
  ```

### ✅ FIX-016: TypeORM Cascade Save su Entità Caricate Esternamente
- **Issue:** 🔴 CRITICAL - Adding item to purchase order: 500 `purchase_order_id = null` NOT NULL violation
- **Causa Root:** `manager.save(PurchaseOrder, po)` su entità caricata fuori transazione scatena cascade re-insert su relazioni (items), con FK null
- **Soluzione:** Sostituire `manager.save(Entity, loadedObj)` con `manager.update(Entity, id, fields)` per evitare cascate
- **File Modificati:**
  - `rms-backend/src/purchase-orders/purchase-orders.service.ts` (4 punti: addItem, updateItem, removeItem, receiveItems)
- **Pattern:**
  ```typescript
  // PRIMA (broken - cascade re-insert)
  await manager.save(PurchaseOrder, po);
  // DOPO (fixed - explicit update)
  await manager.update(PurchaseOrder, po.id, { subtotal, taxAmount, totalCost });
  ```

### ✅ FIX-017: Brand URL Validation & Barcode Unique Constraint
- **Issue:** 🟠 HIGH - Brand creation fails with `websiteUrl/logoUrl must be a URL`, Variant creation 500 on empty barcode
- **Causa Root:**
  - `@IsUrl()` valida anche stringhe vuote `""` come URL invalido (anche con `@IsOptional()`)
  - PostgreSQL unique constraint su barcode: `""` non è NULL, quindi duplicati violano il vincolo
- **Soluzione:** Convertire stringhe vuote a `undefined` prima dell'invio al backend
- **File Modificati:**
  - `rms-frontend/src/views/app/catalog/BrandsView.vue` - `websiteUrl/logoUrl: value.trim() || undefined`
  - `rms-frontend/src/views/app/ProductDetailView.vue` - `barcode: value.trim() || undefined`

### ✅ FIX-018: Purchase Order Auto-Receive on Status "Received"
- **Issue:** 🟠 HIGH - Setting PO status to "Received" manually didn't auto-receive unreceived items
- **Problema:** Items non ricevuti rimanevano con `quantityReceived < quantityOrdered`, bloccati per sempre
- **Soluzione:**
  - Backend: `updateStatus()` auto-riceve items restanti quando stato → Received, aggiorna stock
  - Frontend: Nasconde bottone "Change Status" per stati terminali (Received, Cancelled)
- **File Modificati:**
  - `rms-backend/src/purchase-orders/purchase-orders.service.ts:updateStatus()` - Auto-receive logic
  - `rms-frontend/src/views/app/PurchaseOrderDetailView.vue` - v-if condition su Change Status

### ✅ FIX-019: Stock Movements API Response Shape Mismatch
- **Issue:** 🟠 HIGH - Movements page showed "Invalid Date" with wrong row count
- **Causa Root:** Backend returns `{ movements: [...], total: N }` ma frontend trattava `response.data` come array diretto
- **Soluzione:** Estrarre `response.data.movements` nell'API layer
- **File Modificato:** `rms-frontend/src/api/inventory.api.ts:59`

### ✅ FIX-020: Table Rows Clickable (UX Improvement)
- **Issue:** 🟡 MEDIUM - Icone "eye" per aprire dettagli poco intuitive
- **Soluzione:** Resa cliccabile l'intera riga della tabella, rimossa icona eye
- **File Modificati:**
  - `rms-frontend/src/components/common/BaseTable.vue` - Aggiunto `clickable` prop, `row-click` emit, `@click.stop` su actions
  - `rms-frontend/src/views/app/SuppliersView.vue` - Clickable rows → detail
  - `rms-frontend/src/views/app/ProductsView.vue` - Clickable rows → detail
  - `rms-frontend/src/views/app/PurchaseOrdersView.vue` - Clickable rows → detail
  - `rms-frontend/src/views/app/catalog/SizeScalesView.vue` - Clickable rows → sizes modal

### ✅ FIX-021: Size Scales UX - Auto-Open Sizes Modal After Creation
- **Issue:** 🟢 LOW - Dopo creazione scala taglie, utente doveva cercarla manualmente per aggiungere taglie
- **Soluzione:** Dopo creazione, auto-refresh lista e apertura automatica del modal taglie
- **File Modificato:** `rms-frontend/src/views/app/catalog/SizeScalesView.vue`

---

## Risultati Test Endpoint

> Test eseguiti il 22/01/2026 con Docker stack running

### Credenziali Testate (Aggiornate 26/01/2026)

| Utente | Email | Ruolo | Permessi | Tenant |
|--------|-------|-------|----------|--------|
| SuperAdmin | superadmin@system.com | SUPER_ADMIN | ALL (20) | null (global) |
| Admin Acme | admin@acme.com | ADMIN | users:*,roles:*,permissions:read,stores:* (11) | Acme Corp |
| User Acme | user@acme.com | USER | NONE (0) | Acme Corp |
| Admin Tech | admin@techinnovations.com | ADMIN | users:*,roles:*,permissions:read,stores:* (11) | Tech Innovations |

### Risultati Test per Endpoint

#### Auth Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| POST /auth/login | ✅ | ✅ | ✅ | OK |
| POST /auth/refresh | ✅ | ✅ | ✅ | OK |
| GET /auth/me | ❌ 404 | ❌ 404 | ❌ 404 | **MANCA ENDPOINT** |

#### Users Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| GET /users | ✅ | ✅ via nginx | ❌ 403 | User ha users:read ma 403! |
| POST /users | ✅ | ✅ | ❌ 403 | OK |
| PATCH /users/:id | ✅ | ✅ | ❌ 403 | **BUG:** lastName diventa null |

#### Tenants Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| GET /tenants | ✅ | ❌ 403 | ❌ 403 | OK - solo SuperAdmin |
| POST /tenants | ✅ | ❌ 403 | ❌ 403 | OK |

#### Roles Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| GET /roles | ✅ | ❌ 403 | ❌ 403 | **BUG:** Admin ha roles:read! |

#### Permissions Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| GET /permissions | ✅ | ❌ 403 | ❌ 403 | Admin non ha permissions:read |

#### Stores Endpoints
| Endpoint | SuperAdmin | Admin | User | Note |
|----------|------------|-------|------|------|
| GET /stores | ✅ | ✅ | ❌ 403 | **BUG:** Admin NON ha stores:read! |
| POST /stores | ✅ | ✅ | ❌ 403 | **BUG:** Admin NON ha stores:create! |
| POST /stores/:id/users | ❌ 404 | ❌ 404 | ❌ 404 | **MANCA ENDPOINT** |

### Bug Critici Trovati dai Test

#### ~~TEST-001: Permissions `stores:*` Non Esistono nel Database~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **Soluzione:** Reset DB per applicare seed corretto (permissions già presenti nel codice)
- **Vedi:** FIX-001

#### ~~TEST-002: Admin ha `roles:read` ma riceve 403 su GET /roles~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **Causa:** Database aveva seed vecchio, mancavano associazioni role-permission
- **Soluzione:** Reset DB
- **Vedi:** FIX-001

#### ~~TEST-003: User ha `users:read` ma riceve 403 su GET /users~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **Vedi:** FIX-001

#### ~~TEST-004: Endpoint GET /auth/me Mancante~~ ✅ RISOLTO
- **Severità:** 🟠 HIGH → ✅ RISOLTO
- **Soluzione:** Implementato endpoint GET /auth/me
- **Vedi:** FIX-003

#### ~~TEST-005: PATCH /users/:id Sovrascrive Campi con null~~ ✅ RISOLTO
- **Severità:** 🟠 HIGH → ✅ RISOLTO
- **Soluzione:** Filtro campi undefined in users.service.ts
- **Vedi:** FIX-006

#### ~~TEST-006: Password Hash nella Risposta Create User~~ ✅ RISOLTO
- **Severità:** 🟠 HIGH → ✅ RISOLTO
- **Soluzione:** Aggiunto @Exclude() su password + ClassSerializerInterceptor globale
- **Vedi:** FIX-002

---

### EVO-001: Form si Chiude dirtettamente al Click del icona X (dovrebbe chiedere conferma) (PAUSED)
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/components/common/BaseModal.vue`
- **Descrizione:** Click di Cancel o della X per uscire chiude modal direttamente e perde dati form
- **Fix Required:** Chiedere conferma all'utente "Perderai i dati.., sei sicuro?"

### FIX-001: Logica Limiti Store/User (PAUSED)
- **Severità:** 🟡 MEDIUM
- **File:** `rms-backend/src/stores/users.service.ts`
- **Descrizione:** Il limite ha senso solo per la creazione di user da parte di admin
- **Discussione:** applicare fix su users (rivedere su store se ha senso visto che è il supradmin a creare/configurare nuovi store(attualmente blocca anche il superadmin)) con proposta in tentan.entity di chatgpt (non su stores! ma su user al più)

---

## Vulnerabilità di Sicurezza

### !! Per SEC-002, SEC-005 e SEC-006, sto valutando la possibilità di usare caddy invece di nginx se ha una configurazione più chiara e veloce!

### SEC-001: HTTPS/SSL Non Configurato
- **Severità:** 🔴 CRITICAL
- **File:** `nginx/conf.d/default.conf`, `nginx/ssl/` (vuota)
- **Rischio:** Man-in-the-middle, credenziali JWT in chiaro
- **Fix Required:**
  1. Generare certificati SSL
  2. Configurare `listen 443 ssl`
  3. Redirect HTTP → HTTPS
  4. Aggiungere HSTS header

### SEC-003: Token Storage in localStorage
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/stores/auth.store.ts:7-8`
- **Codice:**
  ```typescript
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  ```
- **Rischio:** Vulnerabile a XSS - attacker può leggere token
- **Fix:** Cookie HttpOnly tramite backend proxy
Configurazione Proxy:
...

Backend imposta cookie:

javascript// Esempio risposta backend
Set-Cookie: access_token=xxx; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=yyy; HttpOnly; Secure; SameSite=Strict; Path=/api/refresh; Max-Age=604800

Vue fa richieste:

javascript// Axios con credentials
axios.get('/api/protected', {
  withCredentials: true  // Invia automaticamente cookie
})

### SEC-004: JWT Parsing Senza Validazione
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/stores/auth.store.ts:47-61`
- **Descrizione:** `parseJwt()` decodifica ma non verifica firma
- **Nota:** JWT verificato server-side, ma frontend non dovrebbe fidarsi dei claim

### SEC-005: Content-Security-Policy Mancante
- **Severità:** 🟡 MEDIUM
- **File:** `nginx/conf.d/default.conf`
- **Rischio:** Vulnerabile a XSS injection
- **Fix:** Aggiungere CSP header

### SEC-006: Dev Mode Permette Header Arbitrari
- **Severità:** 🟡 MEDIUM
- **File:** `nginx/conf.d/default.conf` (localhost server block)
- **Descrizione:** In dev, client può inviare `X-Is-SuperAdmin: true`
- **Fix:** Settare sempre header fissi anche in dev

### SEC-007: Password Validation Debole
- **Severità:** 🟡 MEDIUM
- **Files:**
  - `rms-backend/src/auth/dto/login.dto.ts`
  - `rms-frontend/src/components/users/UserForm.vue`
- **Problema:** Solo validazione lunghezza minima (8 char), no complessità
- **Fix:** Aggiungere regex per uppercase, lowercase, numeri, simboli

---

## Bug Backend

### BE-001: Race Condition Quota Store
- **Severità:** 🔴 CRITICAL
- **File:** `rms-backend/src/stores/stores.service.ts:44-66`
- **Descrizione:** Due richieste parallele possono superare quota
- **Scenario:**
  1. Request A: legge count=0, limite=1 ✓
  2. Request B: legge count=0, limite=1 ✓
  3. Entrambe creano store → count=2 (limite superato)
- **Fix:** Database-level constraint o pessimistic locking
- *Vedi tenant.entity e soluzione proposta da chatgpt
- !! se la creazione di un nuvo store è in capo al superadmin, questo controllo non serve più. (su user si!)

### BE-002: Race Condition Quota User
- **Severità:** 🔴 CRITICAL
- **File:** `rms-backend/src/users/users.service.ts:37-65`
- **Descrizione:** Stesso problema di BE-001 per utenti

### BE-003: Logout Non Revoca JWT
- **Severità:** 🟠 HIGH
- **File:** `rms-backend/src/auth/auth.service.ts:82-93`
- **Descrizione:** Logout revoca solo refresh token, JWT valido per 15 min
- **Fix:** Implementare JWT blacklist o token revocation list

### ~~BE-004: isSuperAdmin Duplicato~~ ✅ RISOLTO
- **Severità:** 🟡 MEDIUM → ✅ RISOLTO
- **Soluzione:** Creato `src/common/utils/auth.utils.ts` con funzione centralizzata
- **Vedi:** FIX-007

### BE-005: Refresh Token Metadata Non Catturato
- **Severità:** 🟡 MEDIUM
- **File:** `rms-backend/src/auth/auth.service.ts:137`
- **Descrizione:** `userAgent` e `ipAddress` definiti in entity ma mai popolati
- **Impatto:** Nessun tracking device per sicurezza

### BE-006: Rate Limiting Skip su Endpoint Pubblici
- **Severità:** 🟡 MEDIUM
- **File:** `rms-backend/src/common/guards/custom-throttler.guard.ts`
- **Descrizione:** Endpoint pubblici (login, register) saltano rate limiting
- **Rischio:** Brute force possibile

### BE-007: Type Casting con `as any`
- **Severità:** 🟢 LOW
- **Files:** Multiple (roles.service.ts, seed.service.ts, auth.service.ts)
- **Descrizione:** Uso di `as any` e `as unknown as` bypassa TypeScript
- **Fix:** Proper typing

### BE-008: Console.log invece di Logger
- **Severità:** 🟢 LOW
- **File:** `rms-backend/src/database/seeds/seed.service.ts`
- **Fix:** Usare `@nestjs/common` Logger

### BE-009: Missing Database Indexes
- **Severità:** 🟢 LOW
- **Descrizione:** Mancano indici su:
  - `User.email`
  - `Tenant.slug`
  - `Permission.name`
  - `Role.name`
  - `RefreshToken.userId`

---

## Bug Frontend

### ~~FE-001: Token Refresh Loop Infinito~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **File:** `rms-frontend/src/api/axios.ts:28-32`
- **Descrizione:** Se refresh fallisce, loop infinito di retry
- **Soluzione:** Aggiunto skip per `/auth/*` endpoints in axios interceptor
- **Impatto Risolto:** No loop infinito su login fallito
- **Vedi:** FIX-011

### FE-002: Memory Leak in AppSidebar
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/components/app/AppSidebar.vue` e `rms-frontend/src/components/admin/AppSidebar.vue`
- **Codice:**
  ```typescript
  const isActive = (name: string) => computed(() => {
    // Crea NUOVA computed ogni render!
  })
  ```
- **Fix:** Usare computed map invece di factory function
- **Nota:** Folder rinominato da `components/layout/` a `components/admin/` (FIX-012)

### FE-003: Race Condition Login Navigation
- **Severità:** 🟠 HIGH → 🟡 MEDIUM (Parzialmente Risolto)
- **File:** `rms-frontend/src/views/app/AppLoginView.vue:38-46`
- **Descrizione:** Router push non aspetta guard completion
- **Impatto:** Redirect prima di authStore.init()
- **Risoluzione Parziale:** FIX-011 ha migliorato il flusso di login error handling, riducendo race condition
- **Nota:** Ancora da validare completamente con flush() nelle transizioni di router

### FE-004: Store Filtering Inconsistente
- **Severità:** 🟡 MEDIUM
- **Files:**
  - `rms-frontend/src/stores/users.store.ts:14-32`
  - `rms-frontend/src/views/UsersView.vue:53-83`
- **Descrizione:** Store e View hanno logica di filtering diversa

### FE-005: Event Listener Leak in Modal
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/components/common/BaseModal.vue`
- **Descrizione:** Listener su body non rimossi al close

### FE-006: Form Watcher Senza Cleanup
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/components/tenants/TenantForm.vue:64-74`
- **Descrizione:** Watch senza cleanup function

### FE-007: Silent Errors in Interceptor
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/api/axios.ts:42-50`
- **Descrizione:** Redirect senza feedback utente su token scaduto

### FE-008: Form Dirty State Non Tracciato
- **Severità:** 🟡 MEDIUM
- **Files:** UserForm.vue, TenantForm.vue
- **Descrizione:** Nessun warning se utente naviga con modifiche non salvate

### FE-009: Guard JWT Parse Può Throw
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/router/index.ts:107-166`
- **Descrizione:** Guard chiama `isSuperAdmin` che può throw su JWT invalido

### FE-010: Email Validation Regex Permissiva (va migliorata tutta la validazione nei form, dto e il tipo in db in caso)
- **Severità:** 🟢 LOW
- **File:** `rms-frontend/src/views/app/AppLoginView.vue:19`
- **Regex:** `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Problema:** Accetta email senza TLD valido (es. `a@b.c`)

### FE-011: Console.log in Production
- **Severità:** 🟢 LOW
- **Files:** auth.store.ts, AppLoginView.vue, LoginView.vue
- **Fix:** Rimuovere o usare conditional logging (poi li tolgo)


## Traduzione
- traduzione testi interfaccia in italiano (attuale solo inglese) con i18n

---

## Problemi Infrastruttura (Principalmente Nginx -> cambierei volentieri con caddy forse)

### INFRA-001: SSL Directory Vuota
- **Severità:** 🔴 CRITICAL
- **Path:** `nginx/ssl/`
- **Fix:** Generare certificati (Let's Encrypt per prod, self-signed per dev)

### INFRA-002: Nginx Non Aspetta Backend Health
- **Severità:** 🟠 HIGH
- **File:** `docker-compose.yml:14-15`
- **Problema:**
  ```yaml
  depends_on:
    - backend  # Manca condition: service_healthy
  ```
- **Impatto:** Nginx può avviarsi prima che backend sia pronto (502 errors)

### INFRA-003: Frontend Build Non Automatizzato
- **Severità:** 🟠 HIGH
- **File:** `docker-compose.yml`
- **Descrizione:** Richiede `npm run build` manuale in rms-frontend

### INFRA-004: Log Nginx Non Persistente
- **Severità:** 🟡 MEDIUM
- **Descrizione:** `/var/log/nginx/` non in volume, log persi al restart

### INFRA-005: Rate Limit Mismatch
- **Severità:** 🟡 MEDIUM
- **Problema:**
  - Nginx: 10 req/s (api_limit)
  - Backend: 0.11 req/s (100 req/900s)
- **Risultato:** Nginx limiter inutile


### INFRA-006: Backend Porta Esposta
- **Severità:** 🟢 LOW
- **File:** `docker-compose.yml:26`
- **Descrizione:** Porta 3000 esposta direttamente, dovrebbe essere solo via nginx (-> in dev la tengo aperta)

---

## Incongruenze Frontend-Backend

### INC-001: Risposta Login vs Refresh Diversa
- **Backend:** `login()` ritorna `{ user, accessToken, refreshToken }`
- **Backend:** `refreshAccessToken()` ritorna `{ accessToken, refreshToken }` (no user)
- **Impatto:** Frontend deve gestire casi diversi

### INC-002: Permessi Admin Non Allineati
- **Backend:** Admin non ha `permissions:read`
- **Frontend:** Tenta fetch permissions per gestione ruoli custom
- **Risultato:** 403 Forbidden

### INC-004: Validazione Password Non Allineata
- **Backend:** Solo `@MinLength(8)`
- **Frontend:** Solo `password.length < 8`
- **Problema:** Nessuno verifica complessità

---

## Problemi di UX

### UX-001: Dual-Area Confusa
- **Descrizione:** Due aree separate (`/` tenant e `/admin` superadmin) senza indicatore chiaro
- **Impatto:** Utente non capisce in quale area si trova
- Sicuramente non ha senso avere due login visto che c'è il redirect basato sul ruolo! in prod non ci sarà la vista per il superadmin ma verrà hostata localmente o limitata all'accesso!

### UX-002: Loading States Mancanti
- **Descrizione:** Molte pagine non mostrano skeleton/spinner durante fetch
- **Impatto:** App sembra bloccata

### UX-003: Error Messages Generici
- **Descrizione:** Fallback messages come "Failed to fetch users" non utili
- **Impatto:** Utente non sa cosa correggere

### UX-004: Modal Overflow Mobile
- **Descrizione:** Form in modal possono overfloware su schermi piccoli

### UX-005: Nessun Feedback Logout
- **Descrizione:** Logout silenzioso, redirect senza messaggio

---

## Debito Tecnico

### DEBT-001: Nessuna Request Cancellation
- **Frontend:** Non usa AbortController per cancellare fetch in-flight
- **Impatto:** Request continua anche dopo navigazione

### DEBT-002: Nessun Caching API
- **Frontend/Nginx:** Ogni navigazione re-fetch da zero
- **Impatto:** Performance subottimale

### DEBT-003: Nessun Error Boundary Vue
- **Frontend:** Crash componente può rompere tutta l'app

### DEBT-004: Mancano Transaction Database
- **Backend:** Operazioni multi-step senza transazioni
- **Impatto:** Inconsistenze possibili su failure parziale

### DEBT-005: Role Names Stringhe Magiche
- **Backend:** `'SUPER_ADMIN'`, `'ADMIN'`, `'USER'` hardcoded
- **Fix:** Creare enum `RoleName`

### DEBT-006: Missing API Versioning
- **Backend/Nginx:** No `/api/v1/` prefix per versioning

---