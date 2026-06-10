# RMS — QA Scenarios

Documento di riferimento per agenti QA (Playwright MCP e test automatizzati).  
Ogni scenario indica: priorità, tipo, precondizioni, passi e risultato atteso.

**Credenziali di test (post-seed)**
- Tenant admin: `admin@acme.com` / `Password123!`
- SuperAdmin: `superadmin@system.com` / `Password123!`
- Base URL: `https://cremisi.shop` (o `BASE_URL` env)

---

## 0. Autenticazione

### AUTH-01 — Login con credenziali valide
**Priorità:** P0 | **Tipo:** Happy Path | **Automatizzato:** `auth.spec.ts`

**Passi:**
1. Vai a `/login`
2. Inserisci `admin@acme.com` nel campo email
3. Inserisci `Password123!` nel campo password
4. Clicca il pulsante di login (o premi Invio)

**Risultato atteso:** Redirect a `/app`, dashboard visibile con le sezioni di navigazione.

---

### AUTH-02 — Login con password errata
**Priorità:** P0 | **Tipo:** Error Path | **Automatizzato:** `auth.spec.ts`

**Passi:**
1. Vai a `/login`
2. Inserisci `admin@acme.com` e password `wrong`
3. Clicca login

**Risultato atteso:** Messaggio di errore visibile ("credenziali non valide" o simile), nessun redirect.

---

### AUTH-03 — Logout
**Priorità:** P0 | **Tipo:** Happy Path | **Automatizzato:** `auth.spec.ts`

**Precondizioni:** Utente loggato.

**Passi:**
1. Clicca sull'icona utente in header
2. Clicca "Logout" nel dropdown

**Risultato atteso:** Redirect a `/login`, token non più valido (reload manuale su `/app` rimanda a login).

---

### AUTH-04 — Accesso diretto a rotta protetta senza autenticazione
**Priorità:** P0 | **Tipo:** Edge Case | **Automatizzato:** `auth.spec.ts`

**Passi:**
1. Apri direttamente `/app/pos/sales` senza essere loggato

**Risultato atteso:** Redirect automatico a `/login`.

---

### AUTH-05 — Login SuperAdmin e accesso area admin
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `auth.spec.ts`

**Passi:**
1. Vai a `/admin/login`
2. Credenziali superadmin
3. Login

**Risultato atteso:** Redirect a `/admin`, sezione SuperAdmin visibile (Tenants, Users, Stores, Roles).

---

## 1. Cassa — Vendite

### SALES-01 — Nuova vendita con pagamento esatto (già coperto)
**Priorità:** P0 | **Automatizzato:** `sales-workflow.spec.ts`

---

### SALES-02 — Vendita con sconto riga
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `sales.spec.ts`

**Precondizioni:** Loggato, negozio selezionato, prodotto con stock > 0.

**Passi:**
1. Vai a nuova vendita `/app/pos/sales/create`
2. Seleziona negozio
3. Cerca e aggiungi un prodotto
4. Nel carrello, inserisci uno sconto riga (es. €5)
5. Verifica che il totale si aggiorni: `(prezzo - sconto) × qty`
6. Completa la vendita con pagamento esatto

**Risultato atteso:** Vendita creata, totale corretto nel dettaglio.

---

### SALES-03 — Vendita con pagamento parziale → stato PARTIALLY_PAID
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `sales.spec.ts`

**Precondizioni:** Prodotto con prezzo > €10.

**Passi:**
1. Aggiungi prodotto al carrello (es. totale €50)
2. Apri pagamento, inserisci importo €20
3. Clicca "Completa Vendita"

**Risultato atteso:** Vendita creata con stato `PARTIALLY_PAID`, badge visibile nel dettaglio.

---

### SALES-04 — Annullamento vendita PENDING
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `sales.spec.ts`

**Precondizioni:** Esiste una vendita con stato PENDING.

**Passi:**
1. Vai alla lista vendite
2. Clicca sulla vendita PENDING
3. Clicca "Annulla Vendita"
4. Conferma nel dialog

**Risultato atteso:** Stato cambia a `CANCELLED`, stock ripristinato.

---

### SALES-05 — Tentativo di annullamento vendita PAID → bloccato
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `sales.spec.ts`

**Precondizioni:** Esiste una vendita con stato PAID.

**Passi:**
1. Apri il dettaglio della vendita PAID
2. Verifica che il pulsante "Annulla" sia assente o disabilitato

**Risultato atteso:** Impossibile annullare una vendita già pagata.

---

### SALES-06 — Filtro lista vendite per stato
**Priorità:** P2 | **Tipo:** Happy Path | **Automatizzato:** `sales.spec.ts`

**Passi:**
1. Vai a `/app/pos/sales`
2. Seleziona filtro stato = "PAID"
3. Verifica che la lista mostri solo vendite PAID

**Risultato atteso:** Ogni riga visibile ha badge "PAID".

---

## 2. Cassa — Resi Cliente

### RETURNS-01 — Reso su vendita completata
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `returns.spec.ts`

**Precondizioni:** Esiste una vendita con stato PAID contenente almeno 1 articolo.

**Passi:**
1. Vai a `/app/pos/returns`
2. Clicca "Nuovo Reso"
3. Cerca la vendita tramite numero (es. `SALE-`)
4. Seleziona la vendita
5. Inserisci quantità da rendere (es. 1 su 1)
6. Conferma reso

**Risultato atteso:** Reso creato, stock dell'articolo incrementato di 1.

---

### RETURNS-02 — Tentativo reso oltre la quantità acquistata → bloccato
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `returns.spec.ts`

**Passi:**
1. Nel form reso, inserisci quantità > quantità acquistata

**Risultato atteso:** Validazione blocca l'invio, messaggio di errore visibile.

---

## 3. Cassa — Clienti

### CUSTOMERS-01 — Creazione nuovo cliente
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `customers.spec.ts`

**Passi:**
1. Vai a `/app/pos/customers`
2. Clicca "Nuovo Cliente"
3. Compila nome `Test QA`, email `qa-test@example.com`
4. Salva

**Risultato atteso:** Cliente appare in lista, dettaglio mostra saldo store credit €0.

---

### CUSTOMERS-02 — Ricerca cliente per nome
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `customers.spec.ts`

**Passi:**
1. Nella lista clienti, digita "Test QA" nella ricerca
2. Verifica che il risultato contenga il cliente creato in CUSTOMERS-01

**Risultato atteso:** Solo clienti con "Test QA" nel nome sono visibili.

---

## 4. Magazzino — Ordini di Acquisto

### PO-01 — Creazione ordine di acquisto
**Priorità:** P0 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Precondizioni:** Esiste almeno un fornitore e un prodotto con varianti.

**Passi:**
1. Vai a `/app/warehouse/purchase-orders`
2. Clicca "Nuovo Ordine"
3. Seleziona fornitore, negozio
4. Aggiungi almeno 1 articolo (variante + quantità)
5. Salva come bozza

**Risultato atteso:** PO creato con stato `DRAFT`, numero ordine generato (es. `PO-20260519-0001`).

---

### PO-02 — Invio ordine e ricezione merce → incremento stock
**Priorità:** P0 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Precondizioni:** PO in stato `DRAFT`.

**Passi:**
1. Apri il PO
2. Clicca "Invia Ordine" → stato diventa `SENT`
3. Clicca "Ricevi Merce"
4. Inserisci quantità ricevuta per ogni articolo
5. Conferma

**Risultato atteso:** Stato diventa `RECEIVED` (o `PARTIALLY_RECEIVED`), stock del negozio incrementato correttamente.

---

### PO-03 — Eliminazione PO in stato DRAFT
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Passi:**
1. Su un PO in stato `DRAFT`, clicca "Elimina"
2. Conferma

**Risultato atteso:** PO rimosso dalla lista.

---

### PO-04 — Tentativo eliminazione PO SENT → bloccato
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `warehouse.spec.ts`

**Precondizioni:** PO in stato `SENT`.

**Passi:**
1. Verifica che il pulsante "Elimina" sia assente o disabilitato

**Risultato atteso:** Impossibile eliminare un PO già inviato.

---

## 5. Magazzino — Fornitori

### SUPPLIERS-01 — Creazione fornitore
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Passi:**
1. Vai a `/app/warehouse/suppliers`
2. Clicca "Nuovo Fornitore"
3. Compila nome `Fornitore QA Test`, email `supplier-qa@test.com`
4. Salva

**Risultato atteso:** Fornitore appare in lista.

---

### SUPPLIERS-02 — Eliminazione fornitore senza ordini → OK
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Precondizioni:** Fornitore creato in SUPPLIERS-01, senza PO associati.

**Passi:**
1. Apri il fornitore
2. Clicca "Elimina"
3. Conferma

**Risultato atteso:** Fornitore rimosso.

---

## 6. Magazzino — Inventario

### INV-01 — Visualizzazione livelli stock per negozio
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `warehouse.spec.ts`

**Passi:**
1. Vai a `/app/warehouse/inventory`
2. Filtra per negozio "Main Store"
3. Verifica che le righe mostrino variante, quantità e negozio

**Risultato atteso:** Tabella popolata con dati stock coerenti (quantità ≥ 0).

---

## 7. Catalogo — Prodotti

### PROD-01 — Creazione prodotto con varianti
**Priorità:** P0 | **Tipo:** Happy Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste almeno 1 brand, 1 scala taglie con taglie.

**Passi:**
1. Vai a `/app/catalog/products`
2. Clicca "Nuovo Prodotto"
3. Compila nome `Prodotto QA Test`, SKU base `QA-TEST`, seleziona brand e scala taglie
4. Aggiungi almeno 1 variante (taglia, prezzo €99.00)
5. Salva

**Risultato atteso:** Prodotto appare in lista, dettaglio mostra le varianti.

---

### PROD-02 — Ricerca prodotto per SKU
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `catalog.spec.ts`

**Passi:**
1. Nella lista prodotti, digita `QA-TEST` nella barra di ricerca

**Risultato atteso:** Solo il prodotto con SKU `QA-TEST` è visibile.

---

## 8. Catalogo — Attributi (Brand, Collezioni, Colori, Scale Taglie, Tag)

### ATTR-01 — Creazione brand
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `catalog.spec.ts`

**Passi:**
1. Vai a `/app/catalog/brands`
2. Clicca "Nuovo Brand"
3. Nome `Brand QA Test`
4. Salva

**Risultato atteso:** Brand appare in lista.

---

### ATTR-02 — Eliminazione brand NON associato a prodotti → OK
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Brand `Brand QA Test` appena creato, nessun prodotto associato.

**Passi:**
1. Clicca l'icona elimina su "Brand QA Test"
2. Conferma

**Risultato atteso:** Brand rimosso dalla lista.

---

### ATTR-03 — Tentativo eliminazione brand associato a prodotti → bloccato con messaggio
**Priorità:** P0 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste un brand usato da almeno 1 prodotto (es. il brand del prodotto creato in PROD-01).

**Passi:**
1. Vai a `/app/catalog/brands`
2. Clicca elimina sul brand in uso
3. Conferma

**Risultato atteso:** Messaggio di errore visibile con testo che include il numero di prodotti (es. "assigned to N product(s)"), brand ancora presente in lista.

---

### ATTR-04 — Tentativo eliminazione colore usato da varianti → bloccato
**Priorità:** P0 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste un colore assegnato ad almeno una variante prodotto.

**Passi:**
1. Vai a `/app/catalog/colors`
2. Tenta di eliminare il colore in uso

**Risultato atteso:** Messaggio di errore con conteggio varianti, colore non eliminato.

---

### ATTR-05 — Tentativo eliminazione scala taglie in uso → bloccato
**Priorità:** P0 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste una scala taglie usata da almeno 1 prodotto.

**Passi:**
1. Vai a `/app/catalog/size-scales`
2. Tenta di eliminare la scala taglie in uso

**Risultato atteso:** 409 intercettato, messaggio di errore visibile, scala non eliminata.

---

### ATTR-06 — Tentativo eliminazione taglia usata da variante → bloccato
**Priorità:** P0 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste una taglia (es. "M") assegnata a varianti prodotto.

**Passi:**
1. Vai a `/app/catalog/size-scales`, apri una scala
2. Tenta di eliminare una singola taglia in uso

**Risultato atteso:** Errore con conteggio varianti, taglia non eliminata.

---

### ATTR-07 — Tentativo eliminazione tag usato da prodotti → bloccato
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste un tag assegnato ad almeno 1 prodotto.

**Passi:**
1. Vai a `/app/catalog/tags`
2. Tenta di eliminare il tag in uso

**Risultato atteso:** Messaggio di errore visibile, tag non eliminato.

---

### ATTR-08 — Tentativo eliminazione collezione in uso → bloccata
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Precondizioni:** Esiste una collezione assegnata ad almeno 1 prodotto.

**Passi:**
1. Vai a `/app/catalog/collections`
2. Tenta di eliminare la collezione in uso

**Risultato atteso:** Messaggio di errore visibile, collezione non eliminata.

---

### ATTR-09 — Creazione attributo con nome duplicato → bloccato
**Priorità:** P1 | **Tipo:** Error Path | **Automatizzato:** `catalog.spec.ts`

**Passi:**
1. Vai a `/app/catalog/brands`
2. Tenta di creare un brand con un nome già esistente (es. un brand del seed)

**Risultato atteso:** Messaggio "already exists" visibile, brand non creato.

---

## 9. Admin — Utenti e Ruoli

### ADMIN-01 — Creazione nuovo utente tenant
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `admin.spec.ts`

**Passi:**
1. Vai a `/app/admin/users`
2. Clicca "Nuovo Utente"
3. Compila nome, email `qa-user@acme.com`, password, assegna ruolo
4. Salva

**Risultato atteso:** Utente appare in lista con ruolo assegnato.

---

### ADMIN-02 — Creazione ruolo con permessi
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `admin.spec.ts`

**Passi:**
1. Vai a `/app/admin/roles`
2. Clicca "Nuovo Ruolo"
3. Nome `QA Test Role`, seleziona permessi `products:read`, `inventory:read`
4. Salva

**Risultato atteso:** Ruolo appare in lista con i permessi corretti.

---

### ADMIN-03 — Modifica permessi ruolo esistente
**Priorità:** P1 | **Tipo:** Happy Path | **Automatizzato:** `admin.spec.ts`

**Precondizioni:** Ruolo `QA Test Role` da ADMIN-02.

**Passi:**
1. Apri il ruolo
2. Aggiungi permesso `customers:read`
3. Salva

**Risultato atteso:** Ruolo aggiornato, permesso visibile.

---

### ADMIN-04 — Visualizzazione e modifica negozi
**Priorità:** P2 | **Tipo:** Happy Path | **Automatizzato:** `admin.spec.ts`

**Passi:**
1. Vai a `/app/admin/stores`
2. Verifica che "Main Store" sia in lista
3. Clicca su di esso, verifica i dettagli

**Risultato atteso:** Dettaglio negozio visibile con nome, indirizzo.

---

## 10. Smoke Test — Navigazione trasversale

### SMOKE-01 — Tutte le sezioni principali sono raggiungibili
**Priorità:** P0 | **Tipo:** Smoke | **Automatizzato:** `smoke.spec.ts`

**Passi:**
1. Login
2. Naviga su: Dashboard, `/app/pos/sales`, `/app/warehouse/inventory`, `/app/warehouse/purchase-orders`, `/app/catalog/products`, `/app/catalog/brands`, `/app/admin/users`
3. Per ciascuna verifica che la pagina carichi senza errori JS in console

**Risultato atteso:** Nessun redirect inatteso, nessun errore 500 in console, heading principale visibile per ogni sezione.

---

## Note per agenti MCP

Quando usi questi scenari con Playwright MCP:

1. **Prima di ogni scenario** usa `browser_navigate` su `/login` e completa AUTH-01 se non già loggato.
2. **Verifica errori console** con `browser_console_messages` dopo operazioni critiche.
3. **Screenshot on failure** — chiama `browser_take_screenshot` se un `expect` fallisce per documentare lo stato.
4. **Attendi il network** — dopo form submit, usa `browser_wait_for` con selector del feedback (badge stato, alert, redirect URL) prima di dichiarare success/failure.
5. **Ordine consigliato per test di cancellazione attributi:** PROD-01 (crea prodotto) → ATTR-03/04/05/06/07/08 (testa blocco cancellazione) → cleanup manuale se necessario.
