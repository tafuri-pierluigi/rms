# RMS - Issue Tracking

> Documento aggiornato: 12 Febbraio 2026
> Versione: 2.1 (Pulizia post-fix)

---

## Indice

1. [Riepilogo](#riepilogo)
2. [Issue Aperte](#issue-aperte)
3. [Credenziali Test](#credenziali-test)
4. [Storico Fix Completati](#storico-fix-completati)

---

## Riepilogo

### Priorità Aperte

1. **HTTPS/SSL in produzione** - Configurare dominio + Let's Encrypt (Caddy pronto)
2. **Race condition quota** - DB constraint o locking su creazione user/store
3. **Token storage in localStorage** - Migrare a HttpOnly cookie
4. **Form dirty state** - Warning su navigazione con modifiche non salvate
5. **Content-Security-Policy** - Header CSP mancante

---

## Issue Aperte

### Sicurezza

#### SEC-001: HTTPS/SSL in Produzione
- **Severità:** 🔴 CRITICAL
- **Stato:** Caddy configurato e pronto, serve dominio reale per Let's Encrypt automatico
- **Note:** In dev funziona su HTTP, in produzione Caddy gestisce HTTPS automaticamente

#### SEC-003: Token Storage in localStorage
- **Severità:** 🟠 HIGH
- **File:** `rms-frontend/src/stores/auth.store.ts`
- **Rischio:** Vulnerabile a XSS - attacker può leggere token
- **Fix:** Cookie HttpOnly tramite backend proxy

#### SEC-004: JWT Parsing Senza Validazione
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/stores/auth.store.ts`
- **Descrizione:** `parseJwt()` decodifica ma non verifica firma
- **Nota:** JWT verificato server-side, frontend non dovrebbe fidarsi dei claim

#### SEC-005: Content-Security-Policy Mancante
- **Severità:** 🟡 MEDIUM
- **Rischio:** Vulnerabile a XSS injection
- **Fix:** Aggiungere CSP header in Caddy

#### SEC-006: Dev Mode Permette Header Arbitrari
- **Severità:** 🟡 MEDIUM
- **Descrizione:** In dev, client può inviare `X-Is-SuperAdmin: true`
- **Fix:** Settare sempre header fissi anche in dev

#### SEC-007: Password Validation Debole
- **Severità:** 🟡 MEDIUM
- **Problema:** Solo validazione lunghezza minima (8 char), no complessità
- **Fix:** Aggiungere regex per uppercase, lowercase, numeri, simboli

### Bug Backend

#### BE-001: Race Condition Quota Store
- **Severità:** 🔴 CRITICAL
- **File:** `rms-backend/src/stores/stores.service.ts`
- **Descrizione:** Due richieste parallele possono superare quota
- **Fix:** Database-level constraint o pessimistic locking
- **Nota:** Se la creazione store è in capo al superadmin, questo controllo potrebbe non servire più (su user sì!)

#### BE-002: Race Condition Quota User
- **Severità:** 🔴 CRITICAL
- **File:** `rms-backend/src/users/users.service.ts`
- **Descrizione:** Stesso problema di BE-001 per utenti

#### BE-005: Refresh Token Metadata Non Catturato
- **Severità:** 🟡 MEDIUM
- **File:** `rms-backend/src/auth/auth.service.ts`
- **Descrizione:** `userAgent` e `ipAddress` definiti in entity ma mai popolati

#### BE-006: Rate Limiting Skip su Endpoint Pubblici
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Endpoint pubblici (login, register) saltano rate limiting
- **Rischio:** Brute force possibile

#### BE-007: Type Casting con `as any`
- **Severità:** 🟢 LOW
- **Descrizione:** Uso di `as any` in vari service, fix con proper typing

#### BE-008: Console.log invece di Logger
- **Severità:** 🟢 LOW
- **File:** `rms-backend/src/database/seeds/seed.service.ts`

### Bug Frontend

#### FE-002: Memory Leak in AppSidebar
- **Severità:** 🟠 HIGH
- **Descrizione:** `computed()` factory crea nuova computed ogni render, usare computed map

#### FE-003: Race Condition Login Navigation
- **Severità:** 🟡 MEDIUM (Parzialmente Risolto)
- **Descrizione:** Router push non aspetta guard completion, da validare con flush()

#### FE-004: Store Filtering Inconsistente
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Store e View hanno logica di filtering diversa

#### FE-005: Event Listener Leak in Modal
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Listener su body non rimossi al close

#### FE-006: Form Watcher Senza Cleanup
- **Severità:** 🟡 MEDIUM
- **File:** `rms-frontend/src/components/tenants/TenantForm.vue`

#### FE-007: Silent Errors in Interceptor
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Redirect senza feedback utente su token scaduto

#### FE-008: Form Dirty State Non Tracciato
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Nessun warning se utente naviga con modifiche non salvate

#### FE-009: Guard JWT Parse Può Throw
- **Severità:** 🟡 MEDIUM
- **Descrizione:** Guard chiama `isSuperAdmin` che può throw su JWT invalido

#### FE-010: Email Validation Regex Permissiva
- **Severità:** 🟢 LOW
- **Descrizione:** Accetta email senza TLD valido, migliorare validazione form/dto/db

#### FE-011: Console.log in Production
- **Severità:** 🟢 LOW
- **Fix:** Rimuovere o usare conditional logging

### Infrastruttura

#### INFRA-005: Rate Limit Mismatch
- **Severità:** 🟡 MEDIUM
- **Problema:** Nginx: 10 req/s vs Backend: 0.11 req/s - allineare

#### INFRA-006: Backend Porta Esposta
- **Severità:** 🟢 LOW
- **Descrizione:** Porta 3000 esposta direttamente, in produzione solo via reverse proxy

### Incongruenze Frontend-Backend

#### INC-001: Risposta Login vs Refresh Diversa
- **Descrizione:** `login()` ritorna user+tokens, `refresh()` solo tokens

#### INC-004: Validazione Password Non Allineata
- **Descrizione:** Backend e frontend validano solo lunghezza, nessuna complessità

### UX

#### UX-002: Loading States Mancanti
- **Descrizione:** Alcune pagine non mostrano spinner durante fetch

#### UX-003: Error Messages Generici
- **Descrizione:** Fallback messages poco utili per l'utente

#### UX-004: Modal Overflow Mobile
- **Descrizione:** Form in modal possono overfloware su schermi piccoli

#### UX-005: Nessun Feedback Logout
- **Descrizione:** Logout silenzioso, redirect senza messaggio

### Debito Tecnico

#### DEBT-001: Nessuna Request Cancellation
- **Descrizione:** Non usa AbortController per cancellare fetch in-flight

#### DEBT-002: Nessun Caching API
- **Descrizione:** Ogni navigazione re-fetch da zero

#### DEBT-003: Nessun Error Boundary Vue
- **Descrizione:** Crash componente può rompere tutta l'app

#### DEBT-006: Missing API Versioning
- **Descrizione:** No `/api/v1/` prefix per versioning

### Altro

- Traduzione testi interfaccia in italiano con i18n
- Form modal: chiedere conferma prima di chiudere se ci sono dati non salvati (EVO-001)
- Logica limiti store/user: il limite ha senso solo per la creazione user da parte di admin

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

Risolti anche: CORS (SEC-001), JWT blacklist (BE-003), Nginx health check (INFRA-002), Frontend build automatizzato (INFRA-003), Caddy configurato (INFRA-001/SEC-002 parziale), Database indexes (BE-009), Role names enum (DEBT-005), Transactions nei service (DEBT-004).
