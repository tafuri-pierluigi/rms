# CLAUDE.md

Guidance for Claude Code working on RMS (Retail Management System).

> **Last updated:** April 30, 2026 | All business modules complete | Validation + enum fixes (sales, customers, PO)
> **For architecture deep dives:** See `modules/backend/CLAUDE.md` (submodule) or spawn Haiku 4.5 subagent for source files.

## Stack

| Layer | Tech |
|-------|------|
| Backend | NestJS 11.x + TypeORM 0.3.x |
| Frontend | Vue 3 + Vite 7.2.x + Pinia |
| i18n | vue-i18n 9.x (EN/IT) |
| Proxy | Caddy 2 |
| DB | PostgreSQL 15 |

## Architecture

**Docker**: 3 containers — `caddy` (80/443) → `backend` (3000) → `postgres` (5432)
**Frontend build**: Multi-stage in `caddy/Dockerfile` (Vue build → baked into Caddy image)
**Design System**: See `RMS-DESIGN-SYSTEM.md` — complete component library, SCSS variables, CSS custom properties

## Backend Structure

**Modules**: auth, users, tenants, roles, permissions, stores, catalog, products, suppliers, purchase-orders, inventory
**Auth**: JWT (15m) + Refresh Token (7d, rotated). SuperAdmin = `tenantId === null`
**Multi-tenancy**: Manual tenant filtering in services (`where: { tenantId: user.tenantId }`)
**Guard order** (CRITICAL): Throttler → JwtAuth → Tenant → Permissions (app.module.ts)
**Key insight**: `TenantBodyInterceptor` strips `tenantId` from non-SuperAdmin bodies (prevents tenant-hopping)

## Frontend Structure

**Routes**: `/` (app, tenant users), `/admin` (SuperAdmin)
**i18n**: `src/locales/{en,it}.json` — all UI strings use translation keys
**State**: Pinia stores (auth, users, tenants, roles, products, inventory, etc.)
**Components**: See `src/components/common/` — BaseButton, BaseInput, BaseTable, BaseModal, etc.
**Styling**: `src/styles/` — CSS variables, utilities, section accents (cassa/magazzino/admin/addons)
**Navigation**: Dynamic config in `src/config/navigation.ts` with permission filtering + section colors

## Commands

**Dev locale** (postgres + backend + minio, frontend separato con hot-reload)
```bash
cd deploys/local && docker compose up -d
docker compose exec rms_local_backend npm run seed
cd ../../modules/frontend && npm run dev   # http://localhost:5173
```

**Collaudo** (stack completo, frontend buildato, http://localhost:8080)
```bash
cd deploys/test && docker compose up -d --build
docker compose exec rms_test_backend npm run seed
```

**Produzione** (cremisi.shop via Cloudflare Tunnel)
```bash
cd deploys/prod && docker compose up -d --build
docker compose exec rms_prod_backend npm run seed   # solo al primo avvio
./backup.sh                                         # backup manuale
```

**Backend**
```bash
cd modules/backend
npm run start:dev          # Watch mode
npm run test               # Jest unit tests
npm run test:e2e           # E2E tests
npm run lint --fix         # ESLint auto-fix
npm run migration:run      # Run pending migrations
npm run seed               # Populate DB (idempotent)
```

**Frontend**
```bash
cd modules/frontend
npm run build              # Includes vue-tsc type check + Vite build
npm run preview            # Preview production build
```

**E2E (Playwright)**
```bash
cd e2e
npm test                   # Headless Chromium against https://cremisi.shop
npm run test:ui            # Interactive UI mode
npm run test:headed        # Headed browser
BASE_URL=http://localhost npm test  # Run against local dev
```

## Key Files

| Need | Path |
|------|------|
| Backend auth/guards | `modules/backend/CLAUDE.md` (see submodule) |
| Styling system | `modules/frontend/src/styles/main.scss` |
| Layout | `modules/frontend/src/components/layout/TheLayout.vue` |
| Design tokens | `RMS-DESIGN-SYSTEM.md` |
| Navigation | `modules/frontend/src/config/navigation.ts` |
| Vite + i18n | `modules/frontend/vite.config.ts` |
| Docker compose | `deploys/{prod,local,test}/docker-compose.yml` |
| Caddy build | `caddy/Dockerfile` (build context: root) |
| Caddy config | `deploys/{prod,test}/caddy/Caddyfile` |
| Backup prod | `deploys/prod/backup.sh` → `/home/pier/backups/rms/` |
| E2E tests | `e2e/tests/sales-workflow.spec.ts` |

## Test Credentials (post-seed)

`superadmin@system.com` (password da `SUPERADMIN_PASSWORD` env, default `Password123!`) / `admin@acme.com` (`Password123!`)

## Enum Conventions (CRITICAL)

Frontend types must mirror backend enum string values exactly — mismatches cause 400 errors silently until runtime.

| Enum | Values |
|------|--------|
| `PaymentMethod` | `Cash`, `Card`, `BankTransfer`, `MobilePayment`, `GiftCard`, `StoreCredit` |
| `CustomerGender` | `Male`, `Female`, `Other`, `PreferNotToSay` |

i18n keys for these enums use the same PascalCase values (e.g. `sales.paymentMethods.Cash`, `customers.genderPreferNotToSay`).

## Known Issues

None outstanding.

---

*Submodules: `modules/backend/` and `modules/frontend/` are git submodules. Update with `git submodule update --recursive`.*
