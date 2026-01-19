# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RMS** is a multi-tenant Role-Based Access Control (RBAC) system with a NestJS backend and Vue 3 frontend. The project uses Docker for containerized deployment with Nginx as a reverse proxy.

### Architecture
- **Backend**: NestJS multi-tenant authentication system (rms-backend/) - Git submodule
- **Frontend**: Vue 3 + TypeScript + Vite admin panel (rms-frontend/) - Git submodule
- **Proxy**: Nginx reverse proxy (nginx/) with SSL support
- **Database**: PostgreSQL 15
- **Orchestration**: Docker Compose

### Multi-Tenancy Model
- **SuperAdmin**: `tenantId = null` (global access across all tenants)
- **Regular Users**: `tenantId = UUID` (isolated to specific tenant)
- Roles and Permissions are **global** (not tenant-scoped)

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git (with submodules initialized)
- Node.js 18+ (for local development)

### Setup
```bash
# Initialize git submodules
git submodule update --init --recursive

# Create environment file
cp .env.example .env
# Edit .env and set JWT_SECRET (min 32 chars) and DB_PASSWORD

# Start entire stack (backend + frontend + postgres + nginx)
docker compose up -d

# Seed database with test data
docker compose exec backend npm run seed
```

### Access
- Frontend: http://localhost (or https://localhost with SSL)
- Backend API: http://localhost:3000
- Test credentials (after seeding):
  - SuperAdmin: superadmin@system.com / Password123!
  - Admin (Acme Corp): admin@acme.com / Password123!
  - User (Acme Corp): user@acme.com / Password123!

## Project Structure

```
rms/
├── docker-compose.yml       # Root orchestration (nginx, backend, postgres, frontend built into nginx)
├── .env.example             # Environment template
├── nginx/                   # Nginx reverse proxy config
│   ├── nginx.conf           # Main config
│   ├── conf.d/              # Virtual hosts
│   └── ssl/                 # SSL certificates
├── rms-backend/             # Git submodule - NestJS backend
│   ├── src/
│   │   ├── auth/            # Authentication (JWT, refresh tokens)
│   │   ├── users/           # User management
│   │   ├── tenants/         # Tenant management
│   │   ├── roles/           # Role definitions
│   │   ├── permissions/     # Permission definitions
│   │   ├── common/          # Guards, decorators, filters
│   │   ├── database/        # Migrations, seeds, config
│   │   └── main.ts          # App bootstrap
│   ├── package.json
│   ├── Dockerfile
│   ├── docker-compose.yml   # Isolated backend + postgres for local dev
│   ├── CLAUDE.md            # Backend-specific documentation
│   └── [other config files]
└── rms-frontend/            # Git submodule - Vue 3 frontend
    ├── src/
    │   ├── api/             # API client (axios)
    │   ├── components/      # Vue components
    │   ├── stores/          # Pinia state management
    │   ├── router/          # Vue Router config
    │   ├── views/           # Page components
    │   ├── types/           # TypeScript definitions
    │   └── App.vue          # Root component
    ├── package.json
    ├── vite.config.ts       # Vite config with /api proxy
    └── [other config files]
```

## Development Workflows

### Full Stack Development (Recommended)
```bash
# From root directory
docker compose up -d

# Backend logs
docker compose logs -f backend

# Frontend is served through nginx at http://localhost
```

### Backend-Only Development
```bash
# Navigate to backend directory
cd rms-backend

# See CLAUDE.md in rms-backend for backend-specific commands
npm run start:dev         # Development with hot reload
npm run test              # Run tests
npm run migration:generate -- src/database/migrations/NAME
```

### Frontend-Only Development
```bash
# Navigate to frontend directory
cd rms-frontend

npm run dev               # Start dev server on http://localhost:5173
npm run build             # Build for production
```

## Common Commands

### Docker Operations
```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f backend
docker compose logs -f postgres

# Run backend commands inside container
docker compose exec backend npm run seed
docker compose exec backend npm run migration:run

# Rebuild after code changes
docker compose up -d --build
```

### Backend Commands
Refer to **rms-backend/CLAUDE.md** for detailed backend documentation.

Common operations:
```bash
# From rms-backend/ or via docker
npm run start:dev              # Dev with hot reload
npm run build                  # Production build
npm run lint                   # ESLint
npm run test                   # Unit tests
npm run test:e2e               # E2E tests
npm run db:setup               # Run migrations + seed
npm run migration:generate -- src/database/migrations/NAME
npm run migration:run          # Run pending migrations
npm run seed                   # Populate test data
```

### Frontend Commands
```bash
# From rms-frontend/
npm run dev                    # Dev server on :5173
npm run build                  # Build for production
npm run preview                # Preview production build

# Note: Frontend is built into nginx container, see docker-compose.yml
```

## Key Architectural Patterns

### 1. Multi-Tenancy with SuperAdmin Impersonation
- SuperAdmin identified by `tenantId === null`
- SuperAdmin can impersonate any tenant via `X-Tenant-Id` header
- Regular users always filtered to their tenant
- Services must manually apply tenant filtering (not automatic)

See **rms-backend/CLAUDE.md** for detailed multi-tenancy patterns.

### 2. Guard Execution Order (Critical)
1. **ThrottlerGuard**: Rate limiting
2. **JwtAuthGuard**: Authentication
3. **TenantGuard**: Tenant context
4. **RolesGuard**: Authorization

Do not change this order without reviewing security implications.

### 3. Authentication
- JWT tokens (15-minute lifetime)
- Refresh tokens (7-day lifetime, stored in DB, rotation on refresh)
- bcrypt password hashing (10 salt rounds)
- Rate limiting: 100 requests per 15 minutes

### 4. Authorization (RBAC)
- Permission format: `resource:action` (e.g., `users:create`, `tenants:read`)
- Role-permission many-to-many relationship
- Checked via `@Roles()` decorator and RolesGuard
- SuperAdmin role has all permissions by default

### 5. API Communication
- Frontend uses axios with `/api` proxy (proxies to backend:3000)
- CORS handled by Nginx
- Credentials sent in Authorization header
- Tenant context via `X-Tenant-Id` header (SuperAdmin only)

## Database Considerations

### Development
- Auto-sync: `synchronize: true` (schema synced automatically)
- Migrations optional but recommended

### Production
- Auto-sync: `synchronize: false` (migrations only)
- Seed data: run manually or via initialization script

### Migrations
1. Modify entity in `rms-backend/src/*/entities/*.ts`
2. Generate migration: `npm run migration:generate -- src/database/migrations/DescriptiveName`
3. Review migration in `src/database/migrations/`
4. Run migration: `npm run migration:run`
5. Commit both entity and migration files

See **rms-backend/CLAUDE.md** for migration and seeding details.

## Environment Configuration

Key variables (see .env.example for complete list):
- `JWT_SECRET`: Minimum 32 characters, used for token signing
- `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: PostgreSQL credentials
- `NODE_ENV`: development or production
- `BCRYPT_SALT_ROUNDS`: Password hash strength (default 10)
- `RATE_LIMIT_*`: Throttling configuration
- `NGINX_*_PORT`: Nginx port configuration

## Frontend Architecture Details

### Key Directories
- **api/**: Axios client setup and API calls
- **components/**: Reusable Vue components
  - `app/`: Application-specific components
  - `common/`: Shared utility components
  - `layout/`: Layout components
  - `tenants/`, `users/`: Feature-specific components
- **stores/**: Pinia store for state management (auth, user, etc.)
- **router/**: Vue Router configuration
- **types/**: TypeScript interfaces and types
- **utils/**: Helper functions
- **views/**: Page-level components

### Frontend-Backend Integration
- Dev proxy in `vite.config.ts`: `/api/*` → `http://localhost:3000/*`
- Production: Nginx handles routing (see nginx/conf.d/)
- API responses typed with TypeScript
- State managed via Pinia stores

## Nginx Configuration

- Serves frontend static files from `/usr/share/nginx/html` (rms-frontend/dist)
- Proxies API requests to backend container
- SSL support via `nginx/ssl/` (self-signed certs for development)
- Configuration in `nginx/nginx.conf` and `nginx/conf.d/`

For details, see the root `docker-compose.yml` nginx service definition.

## Git Submodules

This project uses Git submodules for rms-backend and rms-frontend:

```bash
# Initialize on clone
git submodule update --init --recursive

# Update submodules to latest
git submodule update --recursive --remote

# Create commits in submodule, then push
cd rms-backend
git add <files>
git commit -m "message"
git push origin main

# Then update parent reference
cd ..
git add rms-backend
git commit -m "Update backend submodule"
git push
```

See GIT_SUBMOD_INIT.md for additional details.

## Testing

### Backend
Run from `rms-backend/`:
```bash
npm run test              # Unit tests
npm run test:e2e          # E2E tests
```

Test users available after seeding:
- SuperAdmin: superadmin@system.com
- Tenant Admin: admin@acme.com
- Regular User: user@acme.com

### Frontend
No explicit test setup documented. Add Jest or Vitest if needed.

## Security Notes

1. **JWT_SECRET**: Must be minimum 32 characters and stored securely (never in Git)
2. **Database Credentials**: Use strong passwords in production
3. **Helmet**: Configured in backend for HTTP security headers
4. **Rate Limiting**: Enabled globally to prevent brute force
5. **Password Hashing**: bcrypt with 10 salt rounds
6. **Refresh Token Rotation**: Old tokens marked as revoked on refresh

## Debugging & Troubleshooting

### Backend Issues
- Check logs: `docker compose logs -f backend`
- Check database connectivity: `docker compose logs -f postgres`
- Test auth: See rms-backend/CLAUDE.md for curl examples

### Frontend Issues
- Dev server: `npm run dev` from rms-frontend/ (logs to console)
- Check browser console for API errors
- Verify backend is running: `curl http://localhost:3000/health` (if endpoint exists)

### Database Issues
- Connect to postgres: `docker compose exec postgres psql -U postgres -d rms_db`
- Check migrations: `\d+` in psql
- Reseed: `docker compose exec backend npm run seed`

## Further Documentation

- **rms-backend/CLAUDE.md**: Comprehensive backend architecture, guards, authentication flows, multi-tenancy patterns
- **rms-backend/AUTH_SYSTEM.md**: Detailed authentication and authorization examples
- **rms-backend/MIGRATIONS_GUIDE.md**: TypeORM migration best practices
- **rms-backend/SEED_GUIDE.md**: Database seeding details
- **rms-backend/QUICKSTART.md**: 4-step setup guide

## Development Tips

1. **Before making changes**: Read the relevant CLAUDE.md (root and rms-backend)
2. **Guard order matters**: Don't change the guard execution order in app.module.ts
3. **Tenant filtering**: Services must manually filter by tenantId (not automatic)
4. **SuperAdmin detection**: Use `tenantId === null` check
5. **API testing**: Use curl or Postman with Bearer tokens and X-Tenant-Id header
6. **Docker rebuild**: After package.json changes, run `docker compose up -d --build`
7. **Git submodules**: Remember to commit submodule references in parent repo after changes
