# CLAUDE.md - RMS Technical Documentation

> Guida tecnica completa per Claude Code (claude.ai/code)
> Ultimo aggiornamento: 26 Gennaio 2026
> Status: EVO-001 Completato - Sistema Permessi Dinamici Implementato

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Authentication & Authorization Flow](#authentication--authorization-flow)
5. [Multi-Tenancy Implementation](#multi-tenancy-implementation)
6. [Backend Technical Details](#backend-technical-details)
7. [Frontend Technical Details](#frontend-technical-details)
8. [Nginx & Proxy Configuration](#nginx--proxy-configuration)
9. [API Reference](#api-reference)
10. [Known Issues & Workarounds](#known-issues--workarounds)
11. [Development Workflows](#development-workflows)
12. [Testing Guide](#testing-guide)
13. [Deployment Checklist](#deployment-checklist)

---

## Project Overview

**RMS** (Role Management System) is a multi-tenant RBAC system built with:

| Layer | Technology | Version |
|-------|------------|---------|
| Backend | NestJS | 11.x |
| Frontend | Vue 3 + Vite | 3.5.x / 7.2.x |
| Database | PostgreSQL | 15 |
| ORM | TypeORM | 0.3.28 |
| State | Pinia | 3.0.x |
| Proxy | Nginx | alpine |
| Container | Docker Compose | 3.8 |

### Repository Structure

```
rms/                           # Root repository
├── docker-compose.yml         # Full stack orchestration
├── .env / .env.example        # Environment configuration
├── CLAUDE.md                  # This file
├── ISSUES_ANALYSIS.md         # Bug tracking & analysis
├── problemi.txt               # Known issues (Italian)
├── nginx/
│   ├── nginx.conf             # Main Nginx config
│   ├── conf.d/default.conf    # Virtual hosts & routing
│   └── ssl/                   # SSL certificates (EMPTY - needs setup)
├── rms-backend/               # Git submodule
│   ├── src/
│   │   ├── app.module.ts      # Root module with global guards
│   │   ├── main.ts            # Bootstrap & CORS config
│   │   ├── auth/              # Authentication module
│   │   ├── users/             # User CRUD + quota
│   │   ├── tenants/           # Tenant management
│   │   ├── roles/             # Role definitions
│   │   ├── permissions/       # Permission definitions
│   │   ├── stores/            # Store management + quota
│   │   ├── common/
│   │   │   ├── guards/        # JwtAuth, Tenant, Permissions, Throttler
│   │   │   └── decorators/    # @Public, @Permissions, @CurrentUser
│   │   └── database/
│   │       ├── migrations/    # TypeORM migrations
│   │       └── seeds/         # Database seeding
│   └── CLAUDE.md              # Backend-specific docs
└── rms-frontend/              # Git submodule
    ├── src/
    │   ├── main.ts            # Vue app bootstrap
    │   ├── App.vue            # Root component
    │   ├── router/index.ts    # Vue Router + navigation guards
    │   ├── stores/            # Pinia stores (auth, users, etc.)
    │   ├── api/               # Axios client + interceptors
    │   ├── views/             # Page components
    │   ├── components/        # Reusable components
    │   └── types/             # TypeScript interfaces
    └── vite.config.ts         # Vite + API proxy config
```

---

## Architecture Deep Dive

### Service Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (rms_nginx)                         │
│  Port: 80/443 | Static files + API proxy                        │
│  Routes: /api/* → backend:3000, /* → /usr/share/nginx/html     │
└────────────────────────────┬────────────────────────────────────┘
                             │ depends_on: backend
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     BACKEND (rms_backend)                        │
│  Port: 3000 | NestJS REST API                                   │
│  Guards: Throttler → JwtAuth → Tenant → Permissions             │
└────────────────────────────┬────────────────────────────────────┘
                             │ depends_on: postgres (healthy)
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   POSTGRES (rms_postgres)                        │
│  Port: 5432 | PostgreSQL 15                                     │
│  Volume: postgres_data (persistent)                             │
└─────────────────────────────────────────────────────────────────┘
```

### Network Configuration

- **Network**: `rms_network` (bridge)
- **Internal DNS**: Services communicate via container names (backend:3000, postgres:5432)
- **External Ports**:
  - 80 (HTTP) → Nginx
  - 443 (HTTPS) → Nginx (not configured yet)
  - 3000 → Backend (direct access, should be internal only in production)
  - 5432 → PostgreSQL (should be internal only in production)

---

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     TENANT      │       │      USER       │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │
│ name            │  │    │ email           │
│ slug (unique)   │  │    │ password (hash) │
│ isActive        │  └───▶│ tenantId (FK)   │──────┐
│ maxUsers        │       │ firstName       │      │
│ maxStores       │       │ lastName        │      │
│ createdAt       │       │ isActive        │      │
│ updatedAt       │       │ deletedAt       │      │
└─────────────────┘       │ createdAt       │      │
        │                 │ updatedAt       │      │
        │                 └────────┬────────┘      │
        │                          │               │
        │                   ┌──────┴──────┐        │
        │                   │             │        │
        ▼                   ▼             ▼        │
┌─────────────────┐  ┌───────────┐  ┌───────────┐  │
│     STORE       │  │user_roles │  │user_stores│  │
├─────────────────┤  ├───────────┤  ├───────────┤  │
│ id (PK)         │  │ userId    │  │ userId    │  │
│ name            │  │ roleId    │  │ storeId   │  │
│ tenantId (FK)   │◀─┼───────────┼──┼───────────┼──┘
│ isActive        │  └───────────┘  └───────────┘
│ createdAt       │        │              │
│ updatedAt       │        │              │
└─────────────────┘        │              │
                           ▼              │
                    ┌─────────────────┐   │
                    │      ROLE       │   │
                    ├─────────────────┤   │
                    │ id (PK)         │◀──┘
                    │ name            │
                    │ description     │
                    │ tenantId (FK)   │ ← null = global role
                    │ createdAt       │
                    │ updatedAt       │
                    └────────┬────────┘
                             │
                      ┌──────┴──────┐
                      ▼             │
               ┌────────────┐       │
               │role_perms  │       │
               ├────────────┤       │
               │ roleId     │───────┘
               │ permId     │────────┐
               └────────────┘        │
                                     ▼
                           ┌─────────────────┐
                           │   PERMISSION    │
                           ├─────────────────┤
                           │ id (PK)         │
                           │ name (unique)   │ ← format: resource:action
                           │ description     │
                           │ createdAt       │
                           │ updatedAt       │
                           └─────────────────┘

┌─────────────────────────┐
│     REFRESH_TOKEN       │
├─────────────────────────┤
│ id (PK)                 │
│ userId (FK)             │
│ token (unique)          │
│ expiresAt               │
│ isRevoked               │
│ userAgent (nullable)    │ ← NOT populated (bug)
│ ipAddress (nullable)    │ ← NOT populated (bug)
│ createdAt               │
└─────────────────────────┘
```

### Key Relationships

| Relationship | Type | Notes |
|--------------|------|-------|
| User → Tenant | ManyToOne | `tenantId = null` for SuperAdmin |
| User ↔ Role | ManyToMany | Via `user_roles` junction |
| User ↔ Store | ManyToMany | Via `user_stores` junction |
| Role → Tenant | ManyToOne | `tenantId = null` for global roles |
| Role ↔ Permission | ManyToMany | Via `role_permissions` junction |
| Store → Tenant | ManyToOne | Stores belong to tenants |
| RefreshToken → User | ManyToOne | For token management |

---

## Authentication & Authorization Flow

### Login Flow

```
┌─────────┐     POST /auth/login      ┌─────────────┐
│ Client  │──────────────────────────▶│   Backend   │
│         │   {email, password}       │             │
└─────────┘                           └──────┬──────┘
                                             │
     1. Validate credentials                 │
     2. Check user.isActive                  │
     3. Check tenant.isActive (if not SA)    │
     4. Generate JWT (15min)                 │
     5. Create RefreshToken (7d)             │
                                             │
┌─────────┐   {user, accessToken,     ┌──────▼──────┐
│ Client  │◀──────refreshToken}───────│   Backend   │
│         │                           │             │
└─────────┘                           └─────────────┘
     │
     │ Store in localStorage:
     │  - accessToken
     │  - refreshToken
     ▼
```

### JWT Payload Structure

```typescript
{
  sub: "user-uuid",           // User ID
  email: "user@example.com",
  tenantId: "tenant-uuid",    // null for SuperAdmin
  roles: ["ADMIN", "USER"],   // Role names
  iat: 1737561234,            // Issued at
  exp: 1737562134             // Expires (15min later)
}
```

### Request Authentication

```
┌─────────┐                                    ┌─────────────┐
│ Client  │───GET /api/users───────────────────│   Nginx     │
│         │ Authorization: Bearer <jwt>        │             │
│         │ X-Tenant-Slug: acme (from subdomain)│            │
└─────────┘                                    └──────┬──────┘
                                                      │
                                                      │ Rewrite: /api/users → /users
                                                      │ Add headers: X-Tenant-Slug, X-Is-SuperAdmin
                                                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                           BACKEND                                 │
├──────────────────────────────────────────────────────────────────┤
│  1. ThrottlerGuard  │ Check rate limit (100 req/15min)           │
│  2. JwtAuthGuard    │ Validate JWT, attach user to request       │
│  3. TenantGuard     │ Validate tenant context from header        │
│  4. PermissionsGuard│ Check @Permissions('users:read')           │
└──────────────────────────────────────────────────────────────────┘
```

### Guard Execution Order (CRITICAL)

**File:** `rms-backend/src/app.module.ts`

```typescript
providers: [
  { provide: APP_GUARD, useClass: CustomThrottlerGuard },  // 1st
  { provide: APP_GUARD, useClass: JwtAuthGuard },          // 2nd
  { provide: APP_GUARD, useClass: TenantGuard },           // 3rd
  { provide: APP_GUARD, useClass: PermissionsGuard },      // 4th
]
```

**DO NOT CHANGE THIS ORDER** - Security implications:
- Throttler first to prevent DDoS before any processing
- JWT before Tenant to identify user
- Tenant before Permissions to set context
- Permissions last to authorize action

### Token Refresh Flow

```
┌─────────┐  POST /auth/refresh       ┌─────────────┐
│ Client  │──────────────────────────▶│   Backend   │
│         │  {refreshToken}           │             │
└─────────┘                           └──────┬──────┘
                                             │
     1. Find refresh token in DB             │
     2. Check not expired/revoked            │
     3. Revoke old token (rotation)          │
     4. Generate new JWT                     │
     5. Create new RefreshToken              │
                                             │
┌─────────┐   {accessToken,           ┌──────▼──────┐
│ Client  │◀───refreshToken}──────────│   Backend   │
└─────────┘                           └─────────────┘
```

---

## Multi-Tenancy Implementation

### Tenant Detection

**3 Scenarios in Nginx:**

| Subdomain | X-Tenant-Slug | X-Is-SuperAdmin | Access |
|-----------|---------------|-----------------|--------|
| `admin.*` | `""` (empty) | `"true"` | SuperAdmin area |
| `acme.*` | `"acme"` | `"false"` | Tenant area |
| `localhost` | (pass-through) | (pass-through) | Dev mode |

### SuperAdmin Detection Pattern

**Backend:**
```typescript
// In any service/controller
const isSuperAdmin = user.tenantId === null;

if (isSuperAdmin) {
  // Can access all tenants, impersonate via X-Tenant-Id header
  return this.repository.find(); // No tenant filter
} else {
  // Restricted to own tenant
  return this.repository.find({ where: { tenantId: user.tenantId } });
}
```

**Frontend:**
```typescript
// In auth.store.ts
const isSuperAdmin = computed(() => {
  const payload = parseJwt(accessToken.value);
  return payload?.tenantId === null;
});
```

### Tenant Filtering (Manual - NOT Automatic)

**IMPORTANT:** TypeORM does NOT auto-filter by tenant. Each service must implement:

```typescript
// CORRECT - Manual tenant filtering
async findAll(user: User): Promise<Entity[]> {
  if (user.tenantId === null) {
    // SuperAdmin sees all
    return this.repository.find();
  }
  // Regular user sees only their tenant
  return this.repository.find({
    where: { tenantId: user.tenantId }
  });
}

// WRONG - No tenant filtering
async findAll(): Promise<Entity[]> {
  return this.repository.find(); // Security vulnerability!
}
```

### TenantBodyInterceptor - Centralized TenantId Protection

**File**: `rms-backend/src/common/interceptors/tenant-body.interceptor.ts`

**Purpose**: Automatically strip `tenantId` from request body for non-SuperAdmin users, preventing unauthorized tenant context changes.

**Security Pattern**:
```typescript
// For non-SuperAdmin:
- POST /users with body { tenantId: "other-tenant" }
  → Interceptor removes tenantId → Forced to own tenant ✓

- PATCH /stores with body { tenantId: "other-tenant" }
  → Interceptor removes tenantId → TenantId preserved ✓

// For SuperAdmin:
- POST /users with body { tenantId: "specific-tenant" }
  → tenantId NOT removed → Can assign to any tenant ✓
```

**Execution Order in app.module.ts**:
```typescript
// After Guards (which identify user + set request.tenantId)
// BEFORE Pipes/DTO validation (which would reject missing tenantId field)
[TenantGuard] → [TenantBodyInterceptor] → [DTO Validation] → [Controller]
```

**Service Implementation**:
```typescript
async update(id: string, updateStoreDto: UpdateStoreDto): Promise<Store> {
  const store = await this.findOne(id);

  // Exclude tenantId from destructuring if undefined (interceptor removed it)
  const { tenantId, ...updateData } = updateStoreDto;
  Object.assign(store, updateData);

  // Only update if explicitly provided (SuperAdmin can change tenant)
  if (tenantId !== undefined) {
    store.tenantId = tenantId;
  }

  return this.storeRepository.save(store);
}
```

---

## Backend Technical Details

### Module Structure

```
src/
├── app.module.ts          # Root module, global guards
├── main.ts                # Bootstrap, CORS, Helmet, Validation
│
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts # POST /auth/login, /register, /refresh, /logout
│   ├── auth.service.ts    # Business logic
│   ├── strategies/
│   │   └── jwt.strategy.ts # Passport JWT strategy
│   ├── dto/
│   │   ├── login.dto.ts
│   │   └── register.dto.ts
│   └── entities/
│       └── refresh-token.entity.ts
│
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts # CRUD + tenant filtering
│   ├── users.service.ts    # Quota checking, password hashing
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       └── user.entity.ts
│
├── tenants/
│   ├── tenants.module.ts
│   ├── tenants.controller.ts
│   ├── tenants.service.ts  # Slug generation
│   ├── dto/...
│   └── entities/
│       └── tenant.entity.ts
│
├── roles/
│   ├── roles.module.ts
│   ├── roles.controller.ts
│   ├── roles.service.ts    # Permission association
│   ├── dto/...
│   └── entities/
│       └── role.entity.ts
│
├── permissions/
│   ├── permissions.module.ts
│   ├── permissions.controller.ts
│   ├── permissions.service.ts
│   ├── dto/...
│   └── entities/
│       └── permission.entity.ts
│
├── stores/
│   ├── stores.module.ts
│   ├── stores.controller.ts # CRUD + user association endpoints
│   ├── stores.service.ts    # Quota checking, user management
│   ├── dto/
│   │   ├── create-store.dto.ts
│   │   └── add-user-to-store.dto.ts
│   └── entities/
│       └── store.entity.ts
│
├── common/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── tenant.guard.ts
│   │   ├── permissions.guard.ts
│   │   └── custom-throttler.guard.ts
│   ├── decorators/
│   │   ├── public.decorator.ts       # @Public() - skip auth
│   │   ├── permissions.decorator.ts  # @Permissions('users:read')
│   │   ├── current-user.decorator.ts # @CurrentUser()
│   │   └── current-tenant.decorator.ts
│   ├── interceptors/
│   │   └── tenant-body.interceptor.ts # Strips tenantId from body for non-SuperAdmin
│   ├── utils/
│   │   └── auth.utils.ts             # isSuperAdmin(), canAccessTenant(), PROTECTED_ROLES
│   └── filters/
│       └── http-exception.filter.ts
│
├── config/
│   ├── config.module.ts
│   └── validation.schema.ts  # Joi validation for env vars
│
└── database/
    ├── database.module.ts
    ├── database.config.ts
    ├── migrations/
    │   └── 1768908661700-initialMigration.ts
    └── seeds/
        ├── seed.module.ts
        └── seed.service.ts  # Creates test data
```

### Permission Format

```
resource:action

Examples:
- users:create
- users:read
- users:update
- users:delete
- tenants:read
- tenants:create
- roles:manage
- permissions:read
- stores:create
```

### Default Roles & Permissions (from seed)

| Role | Permissions | Count | Scope |
|------|-------------|-------|-------|
| SUPER_ADMIN | users:*,tenants:*,roles:*,permissions:*,stores:* | 20 | Global (tenantId = null) |
| ADMIN | users:*,roles:*,permissions:read,stores:read,stores:update | 11 | Per-tenant |
| USER | (none) | 0 | Per-tenant (read-only with no permissions) |

**Format**: `resource:action` (e.g., `users:create`, `stores:delete`)

**Resources**: users, tenants, roles, permissions, stores
**Actions**: create, read, update, delete

### Quota System

**Tenant quotas:**
```typescript
// tenant.entity.ts
maxUsers: number;   // Default: 10
maxStores: number;  // Default: 5
```

**Checked in:**
- `users.service.ts:checkUserQuota()` - Before creating user
- `stores.service.ts:checkStoreQuota()` - Before creating store

**BUG:** Race condition - parallel requests can exceed quota (see ISSUES_ANALYSIS.md)

---

## Frontend Technical Details

### Store Architecture

```
stores/
├── auth.store.ts      # Authentication state, JWT handling
├── users.store.ts     # User CRUD, filtering
├── tenants.store.ts   # Tenant CRUD
├── roles.store.ts     # Role CRUD, permission assignment
└── stores.store.ts    # Store CRUD
```

### Auth Store Pattern

```typescript
// auth.store.ts key exports
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'));
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'));
  const user = ref<User | null>(null);
  const userPermissions = ref<string[]>([]); // NEW - flat permissions array

  // Computed
  const isAuthenticated = computed(() => !!accessToken.value);
  const isSuperAdmin = computed(() => parseJwt(accessToken.value)?.tenantId === null);

  // Permission Helpers (NEW)
  function hasPermission(permission: string): boolean {
    if (isSuperAdmin.value) return true; // SuperAdmin bypasses all
    return userPermissions.value.includes(permission);
  }

  function hasAnyPermission(permissions: string[]): boolean {
    if (isSuperAdmin.value) return true;
    return permissions.some((p) => userPermissions.value.includes(p));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    if (isSuperAdmin.value) return true;
    return permissions.every((p) => userPermissions.value.includes(p));
  }

  // Actions
  async function login(email: string, password: string): Promise<boolean>;
  async function logout(): Promise<void>;
  async function refreshAccessToken(): Promise<boolean>;
  async function setTokens(access: string, refresh: string): Promise<void>;
  async function init(): Promise<void>; // Called on app mount
  private async function fetchUserDetails(): Promise<void>; // Fetch permissions from /auth/me

  return {
    accessToken, user, userPermissions,
    isAuthenticated, isSuperAdmin,
    hasPermission, hasAnyPermission, hasAllPermissions,
    login, logout, ...
  };
});
```

**Permission Flow**:
1. User logs in → JWT contains only roles
2. `setTokens()` calls `fetchUserDetails()` → GET /auth/me returns flattened permissions
3. `userPermissions` ref populated with string[] (e.g., `["users:read", "stores:create"]`)
4. UI components call `hasPermission()` helpers for O(1) checks
5. Page refresh → `init()` calls `fetchUserDetails()` again

### API Client Pattern

```typescript
// api/axios.ts
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor - add JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle 401, refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Attempt refresh...
    }
  }
);
```

### Router Guards

```typescript
// router/index.ts
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();

  // Initialize auth state on first navigation
  if (!authStore.user && authStore.accessToken) {
    authStore.init();
  }

  // Public routes
  if (to.meta.public) return true;

  // Auth required
  if (!authStore.isAuthenticated) {
    return { name: 'login' };
  }

  // SuperAdmin only routes
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return { name: 'app-dashboard' };
  }

  return true;
});
```

### Two Application Areas

| Area | Path Prefix | Target User | Layout |
|------|-------------|-------------|--------|
| App | `/` | Tenant Admin/User | AppLayout |
| Admin | `/admin` | SuperAdmin | AdminLayout |

---

## Nginx & Proxy Configuration

### Virtual Host Configuration

```nginx
# nginx/conf.d/default.conf

# 1. SuperAdmin Area (admin.*)
server {
    listen 80;
    server_name admin.* admin.localhost;

    # Force SuperAdmin context
    proxy_set_header X-Tenant-Slug "";
    proxy_set_header X-Is-SuperAdmin "true";

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend;
    }
}

# 2. Tenant Area (tenant-slug.*)
server {
    listen 80;
    server_name ~^(?<tenant>[^.]+)\..*;

    # Extract tenant from subdomain
    proxy_set_header X-Tenant-Slug $tenant;
    proxy_set_header X-Is-SuperAdmin "false";

    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend;
    }
}

# 3. Development (localhost)
server {
    listen 80;
    server_name localhost 127.0.0.1;

    # Pass-through (no forced headers)
    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://backend;
    }
}
```

### Rate Limiting

```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=1r/s;
```

**Applied:**
- `/api/*` → api_limit (10 req/s, burst 20)
- `/api/auth/*` → login_limit (1 req/s, burst 5)

### Security Headers (Applied)

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;  # Deprecated
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**MISSING (Critical):**
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | `/auth/login` | `{email, password}` | `{user, accessToken, refreshToken}` | No |
| POST | `/auth/register` | `{email, password, firstName, lastName}` | `{user, accessToken, refreshToken}` | No |
| POST | `/auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken}` | No |
| POST | `/auth/logout` | `{refreshToken}` | `{message}` | Yes |
| GET | `/auth/me` | - | `User` | Yes |

### User Endpoints

| Method | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| GET | `/users` | `users:read` | Filtered by tenant |
| GET | `/users/:id` | `users:read` | Single user |
| POST | `/users` | `users:create` | Quota checked |
| PATCH | `/users/:id` | `users:update` | |
| DELETE | `/users/:id` | `users:delete` | Soft delete |

### Tenant Endpoints (SuperAdmin only)

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/tenants` | `tenants:read` |
| GET | `/tenants/:id` | `tenants:read` |
| POST | `/tenants` | `tenants:create` |
| PATCH | `/tenants/:id` | `tenants:update` |
| DELETE | `/tenants/:id` | `tenants:delete` |

### Role Endpoints

| Method | Endpoint | Permission |
|--------|----------|------------|
| GET | `/roles` | `roles:read` |
| POST | `/roles` | `roles:create` |
| PATCH | `/roles/:id` | `roles:update` |
| DELETE | `/roles/:id` | `roles:delete` |

### Store Endpoints

| Method | Endpoint | Permission | Notes |
|--------|----------|------------|-------|
| GET | `/stores` | `stores:read` | Filtered by tenant |
| POST | `/stores` | `stores:create` | Quota checked |
| PATCH | `/stores/:id` | `stores:update` | |
| DELETE | `/stores/:id` | `stores:delete` | |
| POST | `/stores/:id/users` | `stores:update` | Add user to store |
| DELETE | `/stores/:id/users/:userId` | `stores:update` | Remove user from store |

---

## Known Issues & Workarounds

> Full details in ISSUES_ANALYSIS.md

### Critical Issues

| ID | Issue | Status |
|----|-------|--------|
| ~~SEC-001~~ | ~~CORS `origin: true`~~ | ✅ FIXED - Whitelist via CORS_ORIGINS env |
| SEC-002 | No HTTPS | TODO - Generate SSL certs, configure nginx |
| ~~BUG-001~~ | ~~`/stores/:id/users` 404~~ | ✅ FIXED - Endpoints implemented |
| ~~BUG-002~~ | ~~Permissions 403 for Admin~~ | ✅ FIXED - DB reset with correct seed |
| BE-001 | Race condition quota | TODO - Use DB constraint or locking |
| FE-001 | Token refresh loop | TODO - Add retry counter |

### Feature Gaps

| Feature | Status | Notes |
|---------|--------|-------|
| User-Role association UI | Partial | Available in user form |
| User-Store association UI | Partial | Checkbox in user form |
| Form dirty state | Missing | Data lost on accidental close |
| JWT blacklist on logout | Missing | Token valid for 15min after logout |

---

## Development Workflows

### Quick Start

```bash
# 1. Clone with submodules
git clone --recursive https://github.com/your/rms.git
cd rms

# 2. Configure environment
cp .env.example .env
# Edit .env: set JWT_SECRET (min 32 chars), DB_PASSWORD

# 3. Build frontend (required for nginx)
cd rms-frontend
npm install
npm run build
cd ..

# 4. Start stack
docker compose up -d

# 5. Seed database
docker compose exec backend npm run seed

# 6. Access
# http://localhost - Frontend
# http://localhost:3000 - Backend API direct
```

### Frontend Development (Hot Reload)

```bash
cd rms-frontend
npm run dev  # http://localhost:5173
# Vite proxies /api/* to localhost:3000
```

### Backend Development (Hot Reload)

```bash
cd rms-backend
npm run start:dev  # http://localhost:3000
```

### Database Operations

```bash
# Connect to psql
docker compose exec postgres psql -U postgres -d rms_db

# View tables
\dt

# Reset database
docker compose down -v
docker compose up -d
docker compose exec backend npm run seed

# Generate migration
cd rms-backend
npm run migration:generate -- src/database/migrations/DescriptionName

# Run migrations
npm run migration:run
```

### Git Submodule Workflow

```bash
# After changing backend
cd rms-backend
git add .
git commit -m "Fix: description"
git push origin main

# Update parent reference
cd ..
git add rms-backend
git commit -m "Update backend submodule to xyz"
git push
```

---

## Testing Guide

### Backend Tests

```bash
cd rms-backend

# Unit tests
npm run test

# E2E tests (requires running postgres)
npm run test:e2e

# Coverage
npm run test:cov
```

### Manual API Testing

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@system.com","password":"Password123!"}'

# Store token
TOKEN="eyJ..."

# Get users (as SuperAdmin)
curl http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN"

# Get users (as tenant admin, simulated)
curl http://localhost:3000/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: tenant-uuid-here"
```

### Test Credentials (after seed)

| User | Email | Password | Role |
|------|-------|----------|------|
| SuperAdmin | superadmin@system.com | Password123! | SUPER_ADMIN |
| Acme Admin | admin@acme.com | Password123! | ADMIN |
| Acme User | user@acme.com | Password123! | USER |

---

## Deployment Checklist

### Pre-Production Requirements

- [ ] Generate SSL certificates (`nginx/ssl/`)
- [ ] Configure HTTPS in nginx (listen 443 ssl)
- [ ] Add HTTP → HTTPS redirect
- [ ] Fix CORS whitelist (`main.ts` - remove `origin: true`)
- [ ] Change default passwords in `.env`
- [ ] Generate secure JWT_SECRET (64+ chars random)
- [ ] Set `NODE_ENV=production`
- [ ] Remove test credentials from `LoginView.vue`
- [ ] Implement JWT blacklist for logout
- [ ] Fix race conditions in quota checks
- [ ] Add database indexes
- [ ] Configure log persistence for nginx
- [ ] Disable direct backend port exposure

### Environment Variables (Production)

```env
NODE_ENV=production
JWT_SECRET=<64+ random chars>
JWT_EXPIRATION=15m
REFRESH_TOKEN_EXPIRATION=7d
DB_USERNAME=rms_prod_user
DB_PASSWORD=<strong random password>
DB_DATABASE=rms_production
RATE_LIMIT_TTL=900
RATE_LIMIT_MAX=100
```

---

## Quick Reference

### Common File Locations

| Need | Path |
|------|------|
| Global guards | `rms-backend/src/app.module.ts` |
| JWT config | `rms-backend/src/auth/auth.module.ts` |
| Permission decorator | `rms-backend/src/common/decorators/permissions.decorator.ts` |
| Tenant guard logic | `rms-backend/src/common/guards/tenant.guard.ts` |
| Frontend routes | `rms-frontend/src/router/index.ts` |
| Auth store | `rms-frontend/src/stores/auth.store.ts` |
| API interceptors | `rms-frontend/src/api/axios.ts` |
| Nginx routing | `nginx/conf.d/default.conf` |

### Common Patterns

```typescript
// Check if SuperAdmin (Backend)
const isSuperAdmin = user.tenantId === null;

// Get current user in controller
@Get()
findAll(@CurrentUser() user: User) {
  return this.service.findAll(user);
}

// Require permission
@Permissions('users:create')
@Post()
create() {}

// Public endpoint (skip auth)
@Public()
@Post('login')
login() {}

// Get current user (Frontend)
const authStore = useAuthStore();
const user = authStore.user;
const isSuperAdmin = authStore.isSuperAdmin;
```

---

*Mantenere questo documento aggiornato ad ogni modifica architetturale significativa.*
