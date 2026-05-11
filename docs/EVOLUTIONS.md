# EVOLUTIONS.md - Evolutive e Miglioramenti Futuri

> Documento per tracciare evolutive pianificate e analisi di design
> Creato: 22 Gennaio 2026
> Aggiornato: 26 Gennaio 2026
> Status: EVO-001 COMPLETATO ✅

---

## Indice

1. [Status EVO-001](#status-evo-001-completato)
2. [EVO-001: Sistema Permessi Dinamici Frontend](#evo-001-sistema-permessi-dinamici-frontend)
3. [Piano Implementazione](#piano-implementazione)

---

## Status EVO-001 (COMPLETATO ✅)

**Data Completamento**: 26 Gennaio 2026
**Commit Backend**: `23c850f` - Fix tenantId handling and permissions system
**Commit Frontend**: `d61a4e2` - Implement dynamic permission-based UI controls

### Implementazione Completata

✅ **Backend Changes**
- GET `/auth/me` ritorna flattened `permissions: string[]`
- TenantBodyInterceptor centralizzato per protezione multi-tenant
- Service update methods proteggono tenantId da modifiche non autorizzate
- Seed aggiornato: SUPER_ADMIN (20), ADMIN (11), USER (0) permessi

✅ **Frontend Changes**
- Auth store: `userPermissions` ref + 3 helper functions
- Router: `requiresPermissions` meta field + navigation guard
- UI Components: Permission checks su sidebar e action icons
- Views: StoresView, UsersView, RolesView con permission-based visibility
- Removed: "Manage Users" modal da StoresView

### Test Results (26 Gennaio)

```
✓ SuperAdmin create user with specific tenant
✓ Admin create user forced to own tenant
✓ Admin update store tenantId preserved
✓ SuperAdmin can change tenantId
✓ User permission enforcement (403 Forbidden)
✓ Admin tenant access blocked (403 Forbidden)
```

### Architettura Implementata (Opzione C - Ibrida)

```
Login → JWT (roles only) → Store in localStorage
  ↓
Init/Login → GET /auth/me → Fetch flattened permissions
  ↓
Frontend store → userPermissions: string[] in memory
  ↓
UI/Components → hasPermission() helpers → O(1) checks
```

---

---

## EVO-001: Sistema Permessi Dinamici Frontend

### Obiettivo

Rendere il frontend **dinamicamente reattivo** ai permessi dell'utente, permettendo:
- Menu/sidebar che mostrano solo voci accessibili
- Bottoni/azioni visibili solo se l'utente ha il permesso
- Ruoli e permessi **completamente customizzabili** dall'admin del tenant
- Nessun hardcoding di nomi ruoli (`ADMIN`, `USER`, etc.)

---

### Analisi Sistema Attuale

#### Backend - Come Funziona Ora

**1. Struttura Dati (seed.service.ts:70-101)**
```
Permission {
  name: "resource:action"   // es. "users:create"
  description: string
  resource: string          // es. "users"
  action: string            // es. "create"
}

Role {
  name: string              // es. "ADMIN"
  description: string
  tenantId: string | null   // null = ruolo globale
  permissions: Permission[] // many-to-many
}

User {
  roles: Role[]             // many-to-many
  tenantId: string | null   // null = SuperAdmin
}
```

**2. PermissionsGuard (permissions.guard.ts:37-46)**
```typescript
// Estrae TUTTI i permessi dai ruoli dell'utente
const userPermissions = user.roles.flatMap(
  (role) => role.permissions?.map((p) => p.name) || []
);

// Verifica se ha ALMENO UNO dei permessi richiesti
return requiredPermissions.some((permission) =>
  userPermissions.includes(permission)
);
```

**3. Decoratore @Permissions (permissions.decorator.ts)**
```typescript
@Permissions('users:create', 'users:update')  // OR logic
@Post()
create() {}
```

**4. Controller Pattern (users.controller.ts, stores.controller.ts, etc.)**
```typescript
@Post()
@Permissions('stores:create')
create(@Body() dto, @CurrentUser() user) {
  // isSuperAdmin() per logica aggiuntiva
}
```

#### Frontend - Come Funziona Ora

**1. Auth Store (auth.store.ts:15-45)**
```typescript
// ❌ PROBLEMA: Logica basata su NOMI RUOLI hardcoded
const isSuperAdmin = computed(() => user.value.tenantId === null)

const isAdmin = computed(() => {
  const roles = parseJwt(token).roles
  return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')  // ❌ Hardcoded!
})

const userRoles = computed(() => parseJwt(token).roles)

// ❌ MANCANTE: userPermissions non esiste!
```

**2. Router Guard (router/index.ts:139-154)**
```typescript
// ❌ PROBLEMA: meta basato su ruoli, non permessi
meta: { requiresAdmin: true }
meta: { requiresSuperAdmin: true }

// Guard verifica ruoli hardcoded
if (to.meta.requiresAdmin && !authStore.isAdmin) {
  next({ name: 'dashboard' })
}
```

**3. Sidebar (AppSidebar.vue:17-32)**
```typescript
// ❌ PROBLEMA: Voci menu hardcoded su isAdmin
const menuItems = computed(() => {
  const items = [...]
  if (authStore.isAdmin) {  // ❌ Hardcoded!
    items.push({ name: 'tenant-users', ... })
  }
  return items
})
```

---

### Problemi Identificati

| ID | Problema | Impatto |
|----|----------|---------|
| P1 | Frontend non conosce i **permessi**, solo i **ruoli** | Non può verificare permessi granulari |
| P2 | Logica `isAdmin` hardcoded su nomi ruoli | Ruoli custom non funzionano |
| P3 | Router meta usa `requiresAdmin`, non permessi | Non scalabile |
| P4 | Sidebar mostra voci in base a `isAdmin` | Non dinamico |
| P5 | Nessun helper `hasPermission()` o `can()` | Codice ripetitivo |
| P6 | JWT non contiene permessi, solo ruoli | Serve calcolo client-side o API call |

---

### Soluzioni Proposte

#### Opzione A: Permessi nel JWT

**Descrizione:** Aggiungere array `permissions` nel payload JWT

```typescript
// JWT Payload
{
  sub: "user-uuid",
  email: "user@example.com",
  tenantId: "tenant-uuid",
  roles: ["CUSTOM_ROLE"],
  permissions: ["users:read", "stores:read", "stores:update"]  // ✅ NUOVO
}
```

| Pro | Contro |
|-----|--------|
| Frontend ha subito i permessi | JWT più grande (potenzialmente 2-3KB) |
| No API call aggiuntiva | Permessi "stale" fino a refresh token |
| Parsing locale veloce | Se utente ha 50+ permessi, problematico |

**Implementazione Backend:**
```typescript
// jwt.strategy.ts - Modifica payload
async validate(payload) {
  const user = await this.userService.findOneWithRoles(payload.sub);
  const permissions = user.roles.flatMap(r => r.permissions.map(p => p.name));
  return { ...payload, permissions: [...new Set(permissions)] };
}
```

---

#### Opzione B: Endpoint `/auth/me` con Permessi

**Descrizione:** L'endpoint `/auth/me` (già esistente) ritorna user + permissions

```typescript
// GET /auth/me response
{
  id: "user-uuid",
  email: "user@example.com",
  roles: [{ name: "ADMIN", permissions: [...] }],
  permissions: ["users:read", "stores:read"]  // ✅ Flattened per comodità
}
```

| Pro | Contro |
|-----|--------|
| Permessi sempre freschi | Richiede API call all'init |
| JWT resta piccolo | Latenza iniziale |
| Facile aggiungere altri dati user | Serve gestire loading state |

**Implementazione Backend:**
```typescript
// auth.service.ts
async getMe(userId: string) {
  const user = await this.usersService.findOneWithRolesAndPermissions(userId);
  const permissions = user.roles.flatMap(r => r.permissions.map(p => p.name));
  return {
    ...user,
    permissions: [...new Set(permissions)]
  };
}
```

---

#### Opzione C: Ibrida (Raccomandazione)

**Descrizione:**
1. JWT contiene solo **nomi ruoli** (come ora)
2. All'init, frontend chiama `/auth/me` per ottenere **permessi completi**
3. Permessi cachati in Pinia store
4. Refresh automatico quando ruoli cambiano

```typescript
// Flow
1. Login → JWT con roles
2. authStore.init() → GET /auth/me → permissions[]
3. Store: userPermissions = ref<string[]>([])
4. Helper: hasPermission('users:create') → boolean
```

| Pro | Contro |
|-----|--------|
| JWT piccolo | Una API call in più |
| Permessi sempre aggiornati | Complessità leggermente maggiore |
| Separazione concerns | - |
| Scalabile | - |

---

### Design Frontend Proposto

#### 1. Estensione Auth Store

```typescript
// auth.store.ts
export const useAuthStore = defineStore('auth', () => {
  // ... existing code ...

  const userPermissions = ref<string[]>([])
  const permissionsLoaded = ref(false)

  // Computed helpers
  const hasPermission = (permission: string) => {
    if (isSuperAdmin.value) return true  // SuperAdmin ha tutto
    return userPermissions.value.includes(permission)
  }

  const hasAnyPermission = (...permissions: string[]) => {
    if (isSuperAdmin.value) return true
    return permissions.some(p => userPermissions.value.includes(p))
  }

  const hasAllPermissions = (...permissions: string[]) => {
    if (isSuperAdmin.value) return true
    return permissions.every(p => userPermissions.value.includes(p))
  }

  // Load permissions from /auth/me
  async function loadPermissions() {
    if (!accessToken.value) return
    try {
      const me = await authApi.getMe()
      userPermissions.value = me.permissions || []
      permissionsLoaded.value = true
    } catch {
      userPermissions.value = []
    }
  }

  // Modify init()
  async function init() {
    // ... existing token parsing ...
    await loadPermissions()
  }

  return {
    // ... existing ...
    userPermissions,
    permissionsLoaded,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    loadPermissions,
  }
})
```

#### 2. Composable usePermissions

```typescript
// composables/usePermissions.ts
export function usePermissions() {
  const authStore = useAuthStore()

  const can = (resource: string, action: string) => {
    return authStore.hasPermission(`${resource}:${action}`)
  }

  const canAny = (resource: string, ...actions: string[]) => {
    return authStore.hasAnyPermission(
      ...actions.map(a => `${resource}:${a}`)
    )
  }

  const canManage = (resource: string) => {
    return authStore.hasAnyPermission(
      `${resource}:create`,
      `${resource}:update`,
      `${resource}:delete`
    )
  }

  return { can, canAny, canManage }
}

// Usage in component
const { can, canManage } = usePermissions()
const canCreateUser = can('users', 'create')
const canManageStores = canManage('stores')
```

#### 3. Direttiva v-permission

```typescript
// directives/permission.ts
export const vPermission = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    const authStore = useAuthStore()
    const permission = binding.value

    if (!authStore.hasPermission(permission)) {
      el.style.display = 'none'
      // oppure el.remove() per rimuovere dal DOM
    }
  }
}

// Usage
<button v-permission="'users:create'">Create User</button>
```

#### 4. Componente PermissionGuard

```vue
<!-- components/common/PermissionGuard.vue -->
<script setup lang="ts">
import { useAuthStore } from '@/stores'

interface Props {
  permission?: string
  permissions?: string[]
  mode?: 'any' | 'all'
  fallback?: boolean  // mostra slot fallback invece di nascondere
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'any',
  fallback: false
})

const authStore = useAuthStore()

const hasAccess = computed(() => {
  if (props.permission) {
    return authStore.hasPermission(props.permission)
  }
  if (props.permissions) {
    return props.mode === 'all'
      ? authStore.hasAllPermissions(...props.permissions)
      : authStore.hasAnyPermission(...props.permissions)
  }
  return true
})
</script>

<template>
  <slot v-if="hasAccess" />
  <slot v-else-if="fallback" name="fallback" />
</template>
```

```vue
<!-- Usage -->
<PermissionGuard permission="users:create">
  <button>Create User</button>
</PermissionGuard>

<PermissionGuard :permissions="['users:update', 'users:delete']" mode="any">
  <div class="actions">...</div>
</PermissionGuard>
```

#### 5. Router con Meta Permessi

```typescript
// router/index.ts
{
  path: 'users',
  name: 'tenant-users',
  component: () => import('@/views/UsersView.vue'),
  meta: {
    permissions: ['users:read']  // ✅ Permessi invece di requiresAdmin
  },
},
{
  path: 'roles',
  name: 'tenant-roles',
  component: () => import('@/views/RolesView.vue'),
  meta: {
    permissions: ['roles:read', 'roles:create'],  // any
    permissionMode: 'any'
  },
},

// Guard
router.beforeEach((to) => {
  if (to.meta.permissions) {
    const mode = to.meta.permissionMode || 'any'
    const hasAccess = mode === 'all'
      ? authStore.hasAllPermissions(...to.meta.permissions)
      : authStore.hasAnyPermission(...to.meta.permissions)

    if (!hasAccess) {
      return { name: 'dashboard' }
    }
  }
})
```

#### 6. Sidebar Dinamica

```typescript
// AppSidebar.vue
const menuItems = computed(() => {
  const { can } = usePermissions()

  return [
    {
      name: 'dashboard',
      label: 'Dashboard',
      icon: 'home',
      visible: true  // sempre visibile
    },
    {
      name: 'tenant-stores',
      label: 'Stores',
      icon: 'shop',
      visible: can('stores', 'read')
    },
    {
      name: 'tenant-users',
      label: 'Users',
      icon: 'users',
      visible: can('users', 'read')
    },
    {
      name: 'tenant-roles',
      label: 'Roles',
      icon: 'shield',
      visible: can('roles', 'read')
    },
  ].filter(item => item.visible)
})
```

---

### Modifiche Backend Richieste

#### 1. Aggiornare risposta GET /auth/me

```typescript
// auth.service.ts
async getMe(userId: string): Promise<MeResponse> {
  const user = await this.usersRepository.findOne({
    where: { id: userId },
    relations: ['roles', 'roles.permissions', 'tenant', 'stores'],
  });

  // Flatten permissions con deduplicazione
  const permissionSet = new Set<string>();
  user.roles.forEach(role => {
    role.permissions?.forEach(p => permissionSet.add(p.name));
  });

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    tenantId: user.tenantId,
    tenant: user.tenant,
    roles: user.roles.map(r => ({ id: r.id, name: r.name })),
    permissions: Array.from(permissionSet),  // ✅ NUOVO
    stores: user.stores,
  };
}
```

#### 2. Endpoint Permessi Disponibili (per UI gestione ruoli)

```typescript
// permissions.controller.ts - già esistente, assicurarsi che ritorni tutti i permessi
@Get()
@Permissions('permissions:read')
findAll() {
  return this.permissionsService.findAll();
}
```

---

### Checklist Implementazione (Aggiornata 26 Gennaio 2026)

#### Backend
- [x] Aggiornare `GET /auth/me` per includere `permissions[]` ✅
  - File: `src/auth/auth.service.ts`
  - Implementa flattening permessi da tutti i ruoli
- [x] Assicurare che ruoli includano permessi nelle query ✅
  - Relations configurate correttamente
- [x] Creare TenantBodyInterceptor per protezione multi-tenant ✅
  - File: `src/common/interceptors/tenant-body.interceptor.ts`
  - Strippa tenantId da body per non-SuperAdmin automaticamente
- [ ] (Opzionale) Creare DTO `MeResponseDto` con validazione

#### Frontend
- [x] Aggiungere `userPermissions` e helpers a `auth.store.ts` ✅
  - `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
  - `fetchUserDetails()` lifecycle management
- [x] Aggiornare router meta da `requiresAdmin` a `permissions` ✅
  - `requiresPermissions: string[]`
  - `requiresPermissionsMode: 'any' | 'all'`
- [x] Aggiornare guard router per usare permessi ✅
  - Navigation guard in `router/index.ts`
- [x] Aggiornare `AppSidebar.vue` per menu dinamico ✅
  - Menu items filtrati su `hasPermission()`
- [x] Action icons visibility su action buttons ✅
  - StoresView, UsersView, RolesView
  - Edit/Delete icons controllati da `hasPermission()`
- [ ] Creare `composables/usePermissions.ts` (FUTURO)
  - Wrapper convenienza su auth store helpers
- [ ] Creare direttiva `v-permission` (FUTURO)
  - Sintassi più concisa per template
- [ ] Creare componente `PermissionGuard.vue` (FUTURO)
  - Wrapper componentistico per logica condizionale

#### Testing
- [x] Test SuperAdmin (bypass tutti i permessi) ✅
  - SuperAdmin vede 20 permessi
- [x] Test Admin role (subset permessi) ✅
  - Admin vede 11 permessi, sidebar corretto
- [x] Test User role (zero permessi) ✅
  - User vede 0 permessi, solo dashboard
- [x] Test CRUD operations con diverse entità ✅
  - Create, Read, Update, Delete con Admin
  - Unauthorized operations blocked (403)
- [x] Test multi-tenant context ✅
  - Admin forced al proprio tenant
  - SuperAdmin può cambiare tenant
- [ ] Test cambio ruolo utente (permessi aggiornati) (FUTURO)
  - Cache invalidation needed

---

### Priorità Suggerita (Aggiornata 26 Gennaio 2026)

#### ✅ COMPLETATO - Fase 1-3: Foundation + Integration
1. **Fase 1 - Foundation** (Critico) ✅ COMPLETATO
   - [x] Backend: aggiornare `/auth/me` con permissions[]
   - [x] Frontend: `userPermissions` in store + helper functions
   - [x] TenantBodyInterceptor per multi-tenant safety

2. **Fase 2 - Router Guards** (Alto) ✅ COMPLETATO
   - [x] Aggiornare router con meta permissions
   - [x] Aggiornare sidebar dinamica
   - [x] Permission checks su action icons

3. **Fase 3 - Multi-Tenant Protection** (Alto) ✅ COMPLETATO
   - [x] TenantBodyInterceptor - Centralizzato
   - [x] Service protection logic per tenantId
   - [x] SuperAdmin can change tenant, Admin forced to own

#### 🔮 TODO - Fase 4 onwards: Polish & Future
4. **Fase 4 - Polish** (Basso) - FUTURO
   - [ ] Composable `usePermissions()` - wrapper convenience
   - [ ] Direttiva `v-permission` - sintassi template
   - [ ] Componente `PermissionGuard.vue` - wrapper React-like
   - [ ] Rimuovere tutto l'hardcoding residuo

5. **Fase 5 - Cache Invalidation** (Medio) - FUTURO
   - [ ] WebSocket notification su cambio ruoli
   - [ ] Force refresh permessi
   - [ ] TTL cache (5min default)

6. **Fase 6 - Advanced** (Basso) - FUTURO
   - [ ] Permessi granulari `resource:action:id`
   - [ ] Field-level permissions
   - [ ] Permission inheritance da ruoli gerarchici

---

### Note Architetturali

1. **SuperAdmin Bypass**: Tutte le funzioni `hasPermission()` devono controllare prima `isSuperAdmin` per garantire accesso completo

2. **Cache Invalidation**: Quando un admin modifica i ruoli di un utente, quel utente dovrebbe ricaricare i permessi. Opzioni:
   - WebSocket notification
   - Force refresh al prossimo navigation
   - TTL sulla cache permessi (es. 5 minuti)

3. **Granularità Permessi**: Il sistema attuale usa `resource:action`. Potrebbe servire in futuro:
   - `resource:action:id` per permessi su singolo record
   - `resource:action:field` per permessi su singolo campo

4. **UI Gestione Ruoli**: L'admin deve poter:
   - Vedere tutti i permessi disponibili
   - Creare ruoli custom
   - Assegnare permessi ai ruoli
   - Assegnare ruoli agli utenti

---

---

## Prossime Evoluzioni (EVO-002+)

### EVO-002: Permessi Avanzati & Cache Invalidation
- [ ] WebSocket notification su cambio ruoli
- [ ] Force refresh permessi in real-time
- [ ] TTL cache permessi (configurabile)
- [ ] Cambio ruolo utente → permessi aggiornati al prossimo accesso

### EVO-003: Composable & Utilities
- [ ] `composables/usePermissions.ts` - wrapper convenience
- [ ] `directives/permission.ts` - `v-permission` directive
- [ ] `components/common/PermissionGuard.vue` - component wrapper
- [ ] Pattern riutilizzabili per nuove views

### EVO-004: Business Logic Modules
- [ ] Products module (SKU, inventory, categories)
- [ ] Warehouse module (stock management, locations)
- [ ] Orders module (purchase, sales)
- [ ] Multi-tenant data isolation per modulo
- [ ] Permission checks su business operations

---

*Documento da aggiornare ad ogni evoluzione completata*
*Ultima revisione: 26 Gennaio 2026*
