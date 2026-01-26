# RMS - Analisi Completa Problemi e Criticità

> Documento generato: 26 Gennaio 2026
> Versione: 1.3 (EVO-001 Completato - Sistema Permessi Dinamici)
> Status: In Aggiornamento - Sistema Permessi Online

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
| 🔴 CRITICAL | 12 | 8 | 4 |
| 🟠 HIGH | 18 | 6 | 12 |
| 🟡 MEDIUM | 22 | 2 | 20 |
| 🟢 LOW | 12 | 0 | 12 |

### Top 5 Priorità Assolute

1. ~~**Permissions `stores:*` mancanti nel DB**~~ ✅ RISOLTO
2. ~~**CORS permissivo** (`origin: true`)~~ ✅ RISOLTO
3. **HTTPS/SSL mancante** - Credenziali in chiaro
4. ~~**PermissionsGuard non funziona correttamente**~~ ✅ RISOLTO
5. ~~**Endpoint `/stores/:id/users` mancante**~~ ✅ RISOLTO
6. ~~**Sistema Permessi Frontend Mancante (EVO-001)**~~ ✅ RISOLTO (26 Gennaio)
7. ~~**TenantId Protection (Interceptor)**~~ ✅ RISOLTO (26 Gennaio)

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

## Problemi Noti

> Problemi già identificati in `problemi.txt`

### ~~BUG-001: Endpoint Mancante `/stores/:id/users`~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **Soluzione:** Implementati POST /stores/:id/users e DELETE /stores/:id/users/:userId
- **Vedi:** FIX-004

### BUG-002: Permissions 403 per Admin
- **Severità:** 🔴 CRITICAL
- **File:** `rms-backend/src/permissions/permissions.controller.ts`
- **Descrizione:** Admin riceve 403 su GET `/api/permissions`
- **Causa:** Manca permission `permissions:read` per ruolo ADMIN
- **Fix Required:**
  1. Aggiungere `permissions:read` ad ADMIN nel seed
  2. Implementare logica permessi "visibili" vs "assegnabili"

### BUG-003: Form si Chiude al Click Esterno
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/components/common/BaseModal.vue`
- **Descrizione:** Click di Cancel o della X per uscire chiude modal direttamente e perde dati form
- **Fix Required:** Chiedere conferma all'utente "Perderai i dati.., sei sicuro?"

### BUG-004: Manca Associazione Ruolo a User
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/components/users/UserForm.vue`
- **Descrizione:** Non c'è modo di associare un ruolo a un utente esistente
- **Fix Required:** Aggiungere UI per gestione ruoli utente -> in realtà da users, selezionando un utente e aggiornandolo, c'è una checkbox per associarli uno o piu ruoli.

### BUG-005: Manca Associazione Store a User (PAUSED)
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/views/UsersView.vue`
- **Descrizione:** Non c'è modo di associare uno store a un utente, se non facendo una PATCH a http://localhost/api/users/:id con:
{
	"storeIds": [
		"47c32989-d4bc-44a1-986d-a478bf5a5230"
	]
}
- **Fix Required:** Aggiungere UI per gestione store utente -> in realtà da users, selezionando un utente e aggiornandolo, c'è una checkbox per aggiugnerlo a uno o più stores!

### BUG-006: Logica Limiti Store Errata (PAUSED)
- **Severità:** 🟡 MEDIUM
- **File:** `rms-backend/src/stores/stores.service.ts`
- **Descrizione:** Il limite store ha senso solo se admin crea store, ma logica attuale non è chiara
- **Discussione:** Definire chi può creare store e con quali limiti

---

## Vulnerabilità di Sicurezza

### !! Per SEC-002, SEC-005 e SEC-006, sto valutando la possibilità di usare caddy invece di nginx se ha una configurazione più chiara e veloce!

### ~~SEC-001: CORS Permissivo (origin: true)~~ ✅ RISOLTO
- **Severità:** 🔴 CRITICAL → ✅ RISOLTO
- **Soluzione:** Implementata whitelist CORS configurabile via env var `CORS_ORIGINS`
- **Vedi:** FIX-005
- **Nota:** Per domini dinamici per tenant, estendere la logica nel callback origin

### SEC-002: HTTPS/SSL Non Configurato
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
- **Fix:** Considerare httpOnly cookies o sessionStorage -> preferisco SessionStorage se più semplice

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

### FE-001: Token Refresh Loop Infinito
- **Severità:** 🔴 CRITICAL
- **File:** `rms-frontend/src/api/axios.ts:23-55`
- **Descrizione:** Se refresh fallisce, loop infinito di retry
- **Impatto:** Memory leak, blocco UI
- **Fix:** Contatore retry o check validity prima di retry

### FE-002: Memory Leak in AppSidebar
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/components/layout/AppSidebar.vue:23-29`
- **Codice:**
  ```typescript
  const isActive = (name: string) => computed(() => {
    // Crea NUOVA computed ogni render!
  })
  ```
- **Fix:** Usare computed map invece di factory function

### FE-003: Race Condition Login Navigation
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/views/app/AppLoginView.vue:38-46`
- **Descrizione:** Router push non aspetta guard completion
- **Impatto:** Redirect prima di authStore.init()

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

### FE-010: Email Validation Regex Permissiva
- **Severità:** 🟢 LOW
- **File:** `rms-frontend/src/views/app/AppLoginView.vue:19`
- **Regex:** `!/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- **Problema:** Accetta email senza TLD valido (es. `a@b.c`)

### FE-011: Console.log in Production
- **Severità:** 🟢 LOW
- **Files:** auth.store.ts, AppLoginView.vue, LoginView.vue
- **Fix:** Rimuovere o usare conditional logging

---

## Problemi Infrastruttura

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

### INFRA-006: NODE_ENV Incoerente
- **Severità:** 🟢 LOW
- **File:** `docker-compose.yml:28`
- **Problema:** Default `production` ma .env ha `development`

### INFRA-007: Backend Porta Esposta
- **Severità:** 🟢 LOW
- **File:** `docker-compose.yml:26`
- **Descrizione:** Porta 3000 esposta direttamente, dovrebbe essere solo via nginx

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

### ~~INC-003: Endpoint Store-User Mancante~~ ✅ RISOLTO
- **Vedi:** FIX-004

### INC-004: Validazione Password Non Allineata
- **Backend:** Solo `@MinLength(8)`
- **Frontend:** Solo `password.length < 8`
- **Problema:** Nessuno verifica complessità

---

## Problemi di UX

### UX-001: Dual-Area Confusa
- **Descrizione:** Due aree separate (`/` tenant e `/admin` superadmin) senza indicatore chiaro
- **Impatto:** Utente non capisce in quale area si trova

### UX-002: Loading States Mancanti
- **Descrizione:** Molte pagine non mostrano skeleton/spinner durante fetch
- **Impatto:** App sembra bloccata

### UX-003: Error Messages Generici
- **Descrizione:** Fallback messages come "Failed to fetch users" non utili
- **Impatto:** Utente non sa cosa correggere

### UX-004: Modal Overflow Mobile
- **Descrizione:** Form in modal possono overflowre su schermi piccoli

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

## Piano di Remediation

### Fase 1: Critical Fixes (Sprint 1)

| ID | Issue | Effort | Owner | Status |
|----|-------|--------|-------|--------|
| SEC-001 | Fix CORS origin | 1h | Backend | ✅ DONE |
| SEC-002 | Configurare HTTPS | 4h | DevOps | TODO |
| BE-001 | Race condition store quota | 4h | Backend | TODO |
| BE-002 | Race condition user quota | 2h | Backend | TODO |
| FE-001 | Token refresh loop | 2h | Frontend | TODO |
| BUG-001 | Endpoint store/users | 4h | Backend | ✅ DONE |
| BUG-002 | Permissions 403 admin | 2h | Backend | ✅ DONE |
| TEST-006 | Password in response | 1h | Backend | ✅ DONE |
| TEST-004 | Endpoint /auth/me | 1h | Backend | ✅ DONE |

### Fase 2: High Priority (Sprint 2)

| ID | Issue | Effort | Owner |
|----|-------|--------|-------|
| SEC-003 | Token storage strategy | 4h | Frontend |
| SEC-004 | Rimuovere credenziali hardcoded | 1h | Frontend |
| BE-003 | JWT blacklist logout | 8h | Backend |
| FE-002 | Memory leak sidebar | 2h | Frontend |
| FE-003 | Race condition login | 2h | Frontend |
| BUG-003 | Modal click outside | 1h | Frontend |
| BUG-004 | UI ruolo utente | 8h | Full Stack |
| BUG-005 | UI store utente | 8h | Full Stack |
| INFRA-002 | Nginx health check | 1h | DevOps |

### Fase 3: Medium Priority (Sprint 3-4)

- Centralizzare isSuperAdmin
- Validazione password forte
- Form dirty state tracking
- Error boundaries
- Database indexes
- Log persistenza
- CSP header

### Fase 4: Low Priority (Backlog)

- API versioning
- Request cancellation
- Caching strategy
- Enum role names
- Console.log cleanup

---

## Appendice: File Analizzati

### Backend (55+ file)
- src/main.ts
- src/app.module.ts
- src/auth/* (8 file)
- src/users/* (6 file)
- src/tenants/* (6 file)
- src/roles/* (6 file)
- src/permissions/* (6 file)
- src/stores/* (6 file)
- src/common/guards/* (4 file)
- src/common/decorators/* (4 file)
- src/database/* (8 file)
- src/config/* (2 file)

### Frontend (50+ file)
- src/main.ts
- src/router/index.ts
- src/stores/* (5 file)
- src/api/* (7 file)
- src/views/* (12 file)
- src/components/* (15+ file)
- src/types/* (5 file)
- vite.config.ts
- tsconfig.*.json

### Infrastruttura
- docker-compose.yml
- nginx/nginx.conf
- nginx/conf.d/default.conf
- .env, .env.example

---

*Documento da aggiornare ad ogni fix implementato*
