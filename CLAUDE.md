# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Last updated: March 2026 | All business modules complete (Catalog, Products, Suppliers, POs, Inventory)
> **For deep dives**: spawn a Haiku 4.5 subagent to read the relevant source files directly.

---

## Stack

| Layer | Tech | Version |
|-------|------|---------|
| Backend | NestJS | 11.x |
| ORM | TypeORM | 0.3.x |
| Frontend | Vue 3 + Vite | 3.5.x / 7.2.x |
| State | Pinia | 3.0.x |
| i18n | vue-i18n | 9.x |
| Database | PostgreSQL | 15 |
| Proxy | Caddy | 2 |
| Container | Docker Compose | 3.8 |

---

## Architecture

3 containers on `rms_network`: **caddy** (80/443) → **backend** (3000) → **postgres** (5432).
Caddy bakes the compiled frontend into its image (multi-stage build in `caddy/Dockerfile`) and proxies `/api/*` to NestJS. Nginx config is kept in `nginx/` as a documented alternative but is commented out in `docker-compose.yml`.

---

## Backend (`rms-backend/src/`)

Modules: `auth`, `users`, `tenants`, `roles`, `permissions`, `stores`, `catalog`, `products`, `suppliers`, `purchase-orders`, `inventory`

**Guard order — DO NOT CHANGE:** `Throttler → JwtAuth → Tenant → Permissions` (defined in `app.module.ts`)

**Auth:** JWT (15min) + Refresh Token (7d, rotated). SuperAdmin = `tenantId === null` in JWT payload.

**Permissions:** `resource:action` format (e.g. `users:create`, `inventory:read`). Checked via `@Permissions()` decorator.

**Multi-tenancy:** TypeORM does NOT auto-filter by tenant — every service manually applies `where: { tenantId: user.tenantId }`. SuperAdmin skips the filter.

**`TenantBodyInterceptor`:** Strips `tenantId` from request body for non-SuperAdmin, preventing tenant-hopping attacks.

**TypeORM gotchas:**
- `findOne()` inside a transaction can't see uncommitted data — call after commit
- `manager.save()` on externally-loaded entities causes cascade re-inserts — use `manager.update()` instead
- Empty string `""` ≠ `undefined`/`null` for `@IsUrl()` and unique constraints

---

## Frontend (`rms-frontend/src/`)

| Area | Path prefix | Users | Layout |
|------|-------------|-------|--------|
| App | `/` | Tenant Admin/User | AppLayout |
| Admin | `/admin` | SuperAdmin | AdminLayout |

Views live in `src/views/` (SuperAdmin) and `src/views/app/` (Tenant users).

**i18n:** `src/locales/en.json` and `it.json`. All UI strings must use translation keys.

**Stores (Pinia):** `auth`, `users`, `tenants`, `roles`, `stores`, `suppliers`, `catalog`, `products`, `purchase-orders`, `inventory`

**Auth store key pattern:** On login → fetch `/auth/me` → populate flat `userPermissions: string[]`. `hasPermission()` is O(1). SuperAdmin bypasses all permission checks.

**API client (`api/axios.ts`):** Axios with request interceptor (attach JWT) + response interceptor (401 → auto-refresh, skip auth endpoints to avoid loops).

**Router guards (`router/index.ts`):** Redirect unauthenticated → login; redirect non-SuperAdmin away from `requiresSuperAdmin` routes.

---

## Infrastructure

**Caddy** sets `X-Tenant-Slug` / `X-Is-SuperAdmin` headers from subdomain:
- `admin.*` → SuperAdmin context (`X-Is-SuperAdmin: true`)
- `<slug>.*` → Tenant context (`X-Tenant-Slug: <slug>`)
- `localhost` → no headers set; backend relies on JWT `tenantId` alone

**HTTPS:** Caddy handles it automatically. In dev, `auto_https off` is set in `caddy/Caddyfile`. For production, remove that directive and point a real domain.

**TypeORM migrations** in `rms-backend/src/database/migrations/`. Seed in `seeds/seed.service.ts`.

**Quota system:** `maxUsers` / `maxStores` per tenant, checked before create. Known race condition (BE-001) — not yet fixed with DB locking.

---

## Key Files

| Need | Path |
|------|------|
| Guard wiring | `rms-backend/src/app.module.ts` |
| Tenant guard | `rms-backend/src/common/guards/tenant.guard.ts` |
| TenantBodyInterceptor | `rms-backend/src/common/interceptors/tenant-body.interceptor.ts` |
| Auth store | `rms-frontend/src/stores/auth.store.ts` |
| API client | `rms-frontend/src/api/axios.ts` |
| Frontend routes | `rms-frontend/src/router/index.ts` |
| Proxy routing | `caddy/Caddyfile` |
| Proxy image build | `caddy/Dockerfile` |

---

## Dev Quick Start

```bash
# Full stack (frontend is built inside the Caddy image)
docker compose up -d && docker compose exec backend npm run seed
# App: http://localhost | Admin: http://admin.localhost

# Hot reload frontend (bypasses Caddy, hits backend directly via Vite proxy)
cd rms-frontend && npm install && npm run dev  # http://localhost:5173
```

**Migrations (inside backend container or with local Node):**
```bash
cd rms-backend
npm run migration:generate -- src/database/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

**Test credentials (post-seed):** `superadmin@system.com` / `admin@acme.com` / `user@acme.com` — all use `Password123!`

---

## Open Issues

| ID | Issue | Status |
|----|-------|--------|
| BE-001 | Quota check race condition | TODO — needs DB-level locking |

---

*For API contracts, entity schemas, DTO details, or module internals — read source files directly or spawn a Haiku 4.5 subagent.*
