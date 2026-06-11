# Smoke Test & Audit Findings
**Data:** 2026-06-11 | **Ambiente:** cremisi.shop (staging) | **Tenant:** Acme (admin@acme.com)

---

## ✅ Funziona correttamente

| Endpoint / Feature | Note |
|--------------------|------|
| Auth login / refresh token | OK |
| Catalogo CRUD (brand, collection, color, size-scale, tag) | OK — `isActive` non va nel POST (vedi bug #1) |
| Products GET / POST / PATCH / variant add | OK |
| Storage upload immagine | OK — URL pubblico restituito |
| Immagine accessibile senza auth | OK (by design, bucket pubblico) |
| PO create Draft | OK |
| PO PATCH (note, campi base) | OK |
| PO transizioni Draft→Sent→Received | OK |
| Inventory stock read per store | OK — path: `/api/inventory/stock/store/:storeId` |
| SKU collision → 409 con messaggio leggibile | OK |

---

## 🐛 Bug confermati

### #1 — Brand POST: `isActive` rifiutato con 400
**Endpoint:** `POST /api/catalog/brands`  
**Causa:** Il DTO backend usa `whitelist: true` — il campo `isActive` non è nel `CreateBrandDto`.  
**Stato:** ✅ **NON È UN BUG FE** — `BrandsView.vue:67` stripa già `isActive` prima del POST (`const { isActive, ...createData } = cleanData`). Testato live → 201 senza `isActive` nel body. Il bug era stato trovato testando l'API curl direttamente.

---

### #2 — PO PATCH: `itemsToAdd` ignorato silenziosamente
**Endpoint:** `PATCH /api/purchase-orders/:id`  
**Stato:** ✅ **NON È UN BUG FE** — Il FE non usa mai `itemsToAdd` nel PATCH. `PurchaseOrderCreateView.vue` passa `items` direttamente nel body del `POST /purchase-orders` (campo valido in `CreatePurchaseOrderDto`). Bug trovato testando l'API curl direttamente.

---

### #3 — `costPrice` variante aggiornato al netto dopo PO receive
**Endpoint:** `PATCH /api/purchase-orders/:id/status` → `Received`  
**Osservato:** Variante creata con `costPrice: 10.00` e `discountPercent: 10` → dopo receive, `costPrice` in catalogo diventa `9.00` (= 10 × 0.9).  
**Domanda:** È intenzionale? Il backend salva il costo netto (dopo sconto fornitore) sulla variante.  
**Se non intenzionale:** Il costo lordo dovrebbe essere preservato, il netto è calcolato al volo.

---

### #4 — Inventory endpoint path sbagliato nel frontend
**Backend:** `GET /api/inventory/stock/store/:storeId`  
**Stato:** ✅ **NON È UN BUG FE** — `inventory.api.ts:18` usa già il path corretto `/inventory/stock/store/${storeId}`. Testato live → 200. Bug trovato testando l'API curl direttamente.

---

### #5 (navigazione) — `tenant-stores` route senza `requiresPermissions`
**File:** `src/router/index.ts`  
**Causa:** La route `tenant-stores` non aveva `meta.requiresPermissions`.  
**Impatto:** Chiunque poteva navigare direttamente a `/app/admin/stores` anche senza `stores:read`.  
**Stato:** ✅ **FIXATO** — aggiunto `requiresPermissions: ['stores:read']`.

---

### #6 (navigazione) — `stores` nav item senza `permission`
**File:** `src/config/navigation.ts`  
**Causa:** L'item `stores` nella sezione admin non aveva il campo `permission`.  
**Impatto:** Utenti senza permessi admin (es. cassieri) vedevano l'esagono admin e la voce "Stores" in sidebar → forbidden al click.  
**Stato:** ✅ **FIXATO** — aggiunto `permission: 'stores:read'`.

---

### #7 (navigazione) — `CatalogView` e `TenantAdminHubView` senza `checkCondition`
**File:** `src/views/app/CatalogView.vue`, `src/views/app/TenantAdminHubView.vue`  
**Causa:** `filterVisibleItems` chiamato senza il parametro `checkCondition` (presente in `WarehouseView`).  
**Impatto:** Attualmente non causa bug visibili, ma se vengono aggiunti item con `condition` in queste sezioni non verrebbero filtrati.  
**Stato:** ✅ **FIXATO** — aggiunto `useNavConditions()`.

---

## ℹ️ Osservazioni (non bug, ma da discutere)

### O1 — Immagini MinIO pubbliche senza autenticazione
L'URL restituito dall'upload è accessibile da chiunque senza token. Confermato: `200 315899b` senza `Authorization`.  
**Rischio:** Cross-tenant image access se si conosce/intercetta l'URL.  
**Opzioni discusse:** Presigned URLs, proxy auth Caddy, endpoint BE con validazione tenantId.  
**Decisione:** Non urgente per staging — da affrontare prima del go-live con dati sensibili.

### O2 — `superAdminSections` items senza `permission`
I 4 item del superadmin (tenants, users, stores, roles) non hanno `permission`. Non è un bug perché le route usano `requiresSuperAdmin`, ma è inconsistente con il pattern tenant. Da tenere presente se si estende la logica.

### O3 — PO status enum diverso da quello usato nel frontend
**Backend valori:** `Draft, Sent, PartiallyReceived, Received, Cancelled`  
**Frontend store/UI:** Verifica se usa gli stessi valori — il test ha rivelato che `Committed` e `Pending` non esistono.

---

## 📋 Test dati creati su cremisi.shop (Acme tenant)

| Risorsa | ID / Nome |
|---------|-----------|
| Brand | `Smoke Brand` (c4b8295a) |
| Size Scale | `Smoke Scale` S/M/L (8620cfc1) |
| Prodotto | `Smoke Camicia` (2ba4ae41) — varianti SMK-BLU-S/M/L, SMK-ROS-S |
| PO | `PO-2026-0003` (39216398) — status: Received |
| Stock | SMK-BLU-S: 5 pz @ Acme Negozio Principale |
| Immagine | `https://cremisi.shop/files/products/.../673fa371.png` |
