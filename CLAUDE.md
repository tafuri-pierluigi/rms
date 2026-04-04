# CLAUDE.md

Guidance for Claude Code working on RMS (Resource Management System).

> **Last updated:** March 24, 2026 | Frontend redesign complete (Design System v1.0) | All business modules complete
> **For architecture deep dives:** See `rms-backend/CLAUDE.md` (submodule) or spawn Haiku 4.5 subagent for source files.

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

**Dev (full stack)**
```bash
docker compose up -d && docker compose exec backend npm run seed  # http://localhost
cd rms-frontend && npm run dev  # http://localhost:5173 (hot reload, proxies /api to backend)
```

**Backend**
```bash
cd rms-backend
npm run start:dev          # Watch mode
npm run test               # Jest unit tests
npm run test:e2e           # E2E tests
npm run lint --fix         # ESLint auto-fix
npm run migration:run      # Run pending migrations
npm run seed               # Populate DB (idempotent)
```

**Frontend**
```bash
cd rms-frontend
npm run build              # Includes vue-tsc type check + Vite build
npm run preview            # Preview production build
```

## Key Files

| Need | Path |
|------|------|
| Backend auth/guards | `rms-backend/CLAUDE.md` (see submodule) |
| Styling system | `rms-frontend/src/styles/main.scss` |
| Layout | `rms-frontend/src/components/layout/TheLayout.vue` |
| Design tokens | `RMS-DESIGN-SYSTEM.md` |
| Navigation | `rms-frontend/src/config/navigation.ts` |
| Vite + i18n | `rms-frontend/vite.config.ts` |
| Docker proxy | `caddy/Dockerfile` + `caddy/Caddyfile` |

## Test Credentials (post-seed)

`superadmin@system.com` (password da `SUPERADMIN_PASSWORD` env, default `Password123!`) / `admin@acme.com` (`Password123!`)

## Known Issues

None outstanding.

---

*Submodules: `rms-backend/` and `rms-frontend/` are git submodules. Update with `git submodule update --recursive`.*
