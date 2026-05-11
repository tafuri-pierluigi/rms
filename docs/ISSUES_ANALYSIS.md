# RMS - Issue Tracking

> Documento aggiornato: 31 Marzo 2026
> Versione: 3.0 (Analisi codice reale — tutti i file verificati)

---

## Indice

1. [Riepilogo](#riepilogo)
2. [Issue Aperte](#issue-aperte)
3. [Credenziali Test](#credenziali-test)
4. [Storico Fix Completati](#storico-fix-completati)

---

## Riepilogo

### Priorità Aperte

1. **Race condition quota** (BE-001/002) — DB constraint o locking su creazione user/store
2. **Token storage in localStorage** (SEC-003) — Migrare a HttpOnly cookie
3. **INC-001** — Login vs Refresh response schema diverso (login include `user`, refresh no)
4. **HTTPS in dev** (SEC-001) — `auto_https off` in Caddyfile, ok in dev, da rimuovere in prod
5. **Form dirty state** (FE-008) — Warning su navigazione con modifiche non salvate
6. **Feedback 401/logout** (FE-007, UX-005) — Redirect silenzioso senza toast

---

## Issue Aperte

### Sicurezza

#### SEC-001: HTTPS/SSL
- **Severità:** 🟠 HIGH (produzione)
- **Stato:** Presente, accettabile in dev
- **Dev:** `auto_https off` esplicito nel Caddyfile (riga 14-16). In dev è corretto così.
- **Prod:** Rimuovere `auto_https off` e puntare a un dominio reale — Caddy gestisce Let's Encrypt automaticamente.

#### SEC-003: Token Storage in localStorage
- **Severità:** 🟠 HIGH
- **Stato:** Ancora presente
- **File:** `rms-frontend/src/stores/auth.store.ts` righe 7-8, 106-107, 131-132
- **Codice attuale:**
  ```typescript
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  // set:
  localStorage.setItem('accessToken', access)
  localStorage.setItem('refreshToken', refresh)
  // clear:
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  ```
- **Rischio:** Vulnerabile a XSS — un attacker che inietta script può leggere i token
- **Fix:** Cookie HttpOnly via backend (NestJS setta il cookie, Caddy lo passa; il frontend non tocca i token)

#### SEC-004: JWT Parsing Senza Validazione
- **Severità:** 🟡 MEDIUM (rischio accettabile)
- **Stato:** Presente ma mitigato lato server
- **File:** `rms-frontend/src/stores/auth.store.ts` righe 68-87
- **Nota:** `parseJwt()` fa solo base64 decode del payload, nessuna verifica firma. Accettabile perché il JWT viene validato server-side ad ogni request. Il fallback a `{ sub: '', email: '', ... }` gestisce correttamente i token malformati.

### Bug Backend

#### BE-001: Race Condition Quota Store
- **Severità:** 🔴 CRITICAL
- **Stato:** Ancora presente (protezione solo applicativa, non DB)
- **File:** `rms-backend/src/stores/stores.service.ts` righe 48-71
- **Codice attuale:**
  ```typescript
  private async checkStoreQuota(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepository.findOne({ where: { id: tenantId } })
    const currentStoreCount = await this.storeRepository.count({ where: { tenantId } })
    if (currentStoreCount >= tenant.maxStores) {
      throw new ForbiddenException('Store limit reached...')
    }
  }
  ```
- **Problema:** Il check count → create non è atomico. Due richieste parallele passano entrambe il check prima che una venga persistita.
- **Fix:** Transaction con `SELECT FOR UPDATE` su tenantRepository, oppure CHECK constraint a livello DB.
- **Nota:** Se la creazione store è esclusivamente in capo al superadmin, il rischio è basso; rimane critico per la creazione user (BE-002).

#### BE-002: Race Condition Quota User
- **Severità:** 🔴 CRITICAL
- **Stato:** Ancora presente (stesso pattern di BE-001)
- **File:** `rms-backend/src/users/users.service.ts` righe 32-60
- **Fix:** Stesso approccio di BE-001.

#### BE-007: Type Casting con `as any`
- **Severità:** 🟢 LOW
- **Stato:** Presente, due istanze
- **File:** `rms-backend/src/auth/auth.service.ts` righe 173-174
  ```typescript
  const accessToken = this.jwtService.sign(payload as any, {
    expiresIn: (this.configService.get<string>('JWT_EXPIRATION') || '15m') as any,
  })
  ```
- **Fix:** Usare proper typing dal type `JwtSignOptions` di `@nestjs/jwt`.

### Bug Frontend

#### FE-004: Store Filtering Inconsistente
- **Severità:** 🟡 MEDIUM
- **Stato:** Parzialmente presente
- **Descrizione:** Filtering applicato nei component (UsersView, ProductsView) invece di essere centralizzato negli store Pinia. Nessun crash funzionale, ma inconsistenza architetturale.
- **Fix:** Spostare logica filtro nei rispettivi store come computed property.

#### FE-007: Silent Errors in Interceptor (401)
- **Severità:** 🟡 MEDIUM
- **Stato:** Ancora presente
- **File:** `rms-frontend/src/api/axios.ts` righe 34-57
  ```typescript
  } catch {
    // Refresh failed: nessun feedback, redirect diretto
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    window.location.href = '/login'  // Hard redirect, bypassa Vue Router
  }
  ```
- **Problemi:**
  1. Redirect silenzioso senza toast "Sessione scaduta"
  2. `window.location.href` bypassa Vue Router (nessun transition, nessun guard)
- **Fix:** Emettere evento o settare store error prima del redirect; usare `router.push()`.

#### FE-008: Form Dirty State Non Tracciato
- **Severità:** 🟡 MEDIUM
- **Stato:** Non implementato
- **Descrizione:** Nessun `beforeRouteLeave` nei form principali. L'utente può navigare via perdendo dati senza warning.
- **Fix:** Aggiungere `onBeforeRouteLeave` e un `isDirty` computed nei form principali.

#### FE-010: Email Validation Regex Permissiva
- **Severità:** 🟢 LOW
- **Stato:** Parzialmente presente
- **File:** `rms-frontend/src/components/users/UserForm.vue` riga 93
  ```typescript
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)
  ```
- **Nota:** Backend usa `@IsEmail()` (RFC compliant). Frontend accetta email tipo `a@b.c`. Disallineamento minore.
- **Fix:** Allineare con la stessa regex o usare una libreria come `validator.js`.

### Infrastruttura

#### INFRA-006: Backend Porta Esposta
- **Severità:** 🟢 LOW (dev) / 🟠 HIGH (produzione)
- **Stato:** Presente in docker-compose.yml
- **File:** `docker-compose.yml` riga 22
  ```yaml
  ports:
    - '${BACKEND_PORT:-3000}:3000'
  ```
- **Fix (produzione):** Rimuovere il binding della porta 3000 sull'host; lasciare solo Caddy esposto su 80/443. Backend raggiungibile solo via rete Docker interna.

### Incongruenze Frontend-Backend

#### INC-001: Risposta Login vs Refresh Diversa
- **Severità:** 🟡 MEDIUM
- **Stato:** Ancora presente (verificato nel codice)
- **File:** `rms-backend/src/auth/auth.service.ts`
  ```typescript
  // login() ritorna:
  { user: sanitizeUser(user), accessToken, refreshToken }

  // refreshAccessToken() ritorna:
  { accessToken, refreshToken }  // NO user object
  ```
- **Problema:** Dopo un refresh, il client non riceve i dati utente aggiornati.
- **Fix:** Uniformare la risposta di `refreshAccessToken()` includendo anche lo user, oppure il client fa sempre GET `/auth/me` dopo il refresh.

### UX

#### UX-003: Error Messages Generici
- **Descrizione:** Alcuni fallback messages poco utili per l'utente
- **Stato:** Non analizzato in dettaglio

#### UX-004: Modal Overflow Mobile
- **Descrizione:** Form in modal possono overflowware su schermi piccoli
- **Stato:** Non analizzato in dettaglio

#### UX-005: Nessun Feedback Logout
- **Severità:** 🟢 LOW
- **Stato:** Logout senza toast
- **File:** `rms-frontend/src/components/layout/TheHeader.vue` righe 17-25
  ```typescript
  async function handleLogout() {
    await authStore.logout()
    router.push({ name: 'login' })  // Nessun feedback
  }
  ```
- **Fix:** Aggiungere toast/notifica "Logout effettuato" prima del redirect.

### Debito Tecnico

#### DEBT-001: Nessuna Request Cancellation
- **Severità:** 🟢 LOW
- **Stato:** Nessun `AbortController` trovato nel codice
- **Rischio:** Richieste in corso non vengono cancellate alla navigazione; possibili side-effect su componenti già smontati.
- **Fix:** Implementare AbortController nelle API calls e cancellare on component unmount.

#### DEBT-003: Nessun Error Boundary Vue
- **Severità:** 🟡 MEDIUM
- **Stato:** Non implementato
- **File:** `rms-frontend/src/main.ts` — nessun `app.config.errorHandler` o `onErrorCaptured` in App.vue
- **Fix:** Aggiungere global error handler per evitare white screen su errori runtime.

#### DEBT-006: Missing API Versioning
- **Severità:** 🟢 LOW
- **Stato:** Nessun versioning nelle route backend (`/auth/login`, `/users`, etc.)
- **Fix (futuro):** Prefisso `/api/v1/` o NestJS `@Version()` decorator quando si prevede evoluzione breaking.

---

## Issue Chiuse (verificate nel codice)

| ID | Descrizione | Note |
|----|-------------|------|
| SEC-006 | Dev mode header arbitrari | Caddy non inietta X-Is-SuperAdmin; backend legge solo il JWT |
| BE-005 | Refresh Token metadata | userAgent e ipAddress estratti e salvati correttamente |
| FE-002 | Memory leak AppSidebar | Nessun computed annidato in TheSidebar.vue |
| FE-003 | Race condition login navigation | Guard usa try/catch e next() corretto |
| FE-005 | Event listener leak modal | Nessun addEventListener su body trovato |
| FE-006 | Form watcher senza cleanup | TenantForm.vue usa WatchStopHandle con cleanup esplicito |
| FE-009 | Guard JWT parse può throw | Guard wrappato in try/catch con clearTokens() |
| FE-011 | Console.log in production | Assenti; solo `console.error` condizionato a `import.meta.env.DEV` |
| INFRA-005 | Rate limit mismatch | Solo backend throttler (100 req/900s); Caddy senza rate limit layer |
| INC-004 | Validazione password allineata | — |
| UX-002 | Loading states mancanti | Implementati in componenti principali (BaseTable, store.loading) |
| INFRA-001 | Caddy reverse proxy | Configurato |
| INFRA-002 | Health check docker-compose | Presente |
| INFRA-003 | Frontend Dockerfile | Presente |

---

## Credenziali Test

| Utente | Email | Ruolo | Tenant |
|--------|-------|-------|--------|
| SuperAdmin | superadmin@system.com | SUPER_ADMIN | null (global) |
| Admin Acme | admin@acme.com | ADMIN | Acme Corp |
| User Acme | user@acme.com | USER | Acme Corp |
| Admin Tech | admin@techinnovations.com | ADMIN | Tech Innovations |

Password per tutti: `Password123!`

---

## Storico Fix Completati

| Fix | Descrizione | Data |
|-----|-------------|------|
| FIX-001 | Permissions stores:* e PermissionsGuard (DB reset) | 22/01 |
| FIX-002 | Password hash esposta nelle risposte API | 22/01 |
| FIX-003 | Endpoint GET /auth/me mancante | 22/01 |
| FIX-004 | Endpoint POST/DELETE /stores/:id/users | 22/01 |
| FIX-005 | CORS whitelist | 22/01 |
| FIX-006 | Update parziale utenti (campi null) | 22/01 |
| FIX-007 | Centralizzazione isSuperAdmin | 22/01 |
| FIX-008 | TenantBodyInterceptor per protezione multi-tenant | 26/01 |
| FIX-009 | Sistema permessi dinamici frontend (EVO-001) | 26/01 |
| FIX-010 | User/tenant inactive login validation | 26/01 |
| FIX-011 | Login error handling e axios auth skip | 26/01 |
| FIX-012 | UI layout refactor (fixed header, push sidebar) | 26/01 |
| FIX-013 | Frontend views per 5 moduli business (~60 file) | 12/02 |
| FIX-014 | isActive in create payloads (5 viste) | 12/02 |
| FIX-015 | TypeORM transaction/findOne isolation bug | 12/02 |
| FIX-016 | TypeORM cascade save su entità caricate esternamente | 12/02 |
| FIX-017 | Brand URL validation e barcode unique constraint | 12/02 |
| FIX-018 | Purchase order auto-receive on status "Received" | 12/02 |
| FIX-019 | Stock movements API response shape mismatch | 12/02 |
| FIX-020 | Table rows clickable (UX improvement) | 12/02 |
| FIX-021 | Size scales auto-open sizes modal | 12/02 |
| SEC-001 | CORS whitelist configurabile via env | 12/02 |
| SEC-006 | Header X-Is-SuperAdmin non iniettato da Caddy | 12/02 |
| SEC-007 | Password validation con regex complessità | 12/02 |
| BE-003 | JWT blacklist on logout | 12/02 |
| BE-005 | Refresh Token metadata (userAgent, ipAddress) | 12/02 |
| BE-006 | Rate limiting su endpoint pubblici | 12/02 |
| BE-008 | Console.log → NestJS Logger nel seed service | 12/02 |
| BE-009 | Database indexes su User.tenantId, RefreshToken.userId, Permission(resource,action) | 12/02 |
| INC-004 | Validazione password allineata FE/BE | 12/02 |
| INFRA-001 | Caddy configurato come reverse proxy | 12/02 |
| INFRA-002 | Health check su depends_on nel docker-compose | 12/02 |
| INFRA-003 | Frontend build automatizzato con Dockerfile | 12/02 |
| DEBT-004 | Transactions nei service products e purchase-orders | 12/02 |
| DEBT-005 | Enum RoleName creato, stringhe magiche sostituite | 12/02 |
| SEC-005 | Content-Security-Policy header configurato in Caddy | 12/02 |
