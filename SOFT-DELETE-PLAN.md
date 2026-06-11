# Piano Soft-Delete

**Contesto:** Campo `isActive: boolean` già presente su tutte le entità — nessuna migrazione DB necessaria.

## Richiesta

Sfruttare `isActive` per un soft-delete: i record "cancellati" restano nel DB e l'utente può recuperarli da un cestino.

---

## Punti da progettare

### 1 — Backend: query filtering automatico
Ogni `findAll()` deve aggiungere `where: { isActive: true }` di default.
Decidere: flag `?includeInactive=true` sulla query-string oppure endpoint separato `/trash`?

### 2 — Backend: DELETE → PATCH
`DELETE /api/brands/:id` oggi fa hard-delete. Deve diventare `PATCH isActive=false`.
Comportamento visibile invariato (il record sparisce dalla lista), ma reversibile.

### 3 — Backend: endpoint restore
`PATCH /api/brands/:id/restore` (o equivalente) per riattivare un record.
Nuovo endpoint, nessuna rottura dell'API esistente.

### 4 — Frontend: UI cestino
Ogni sezione deve avere una vista "Cestino" (o toggle "Mostra disattivati") + pulsante Ripristina.
Valutare: cestino globale unico vs cestino per-sezione.

### 5 — Cascata
Se disattivi un `Brand`, i `Product` collegati restano attivi ma con brand invisibile.
Decidere: disattivazione a cascata (rischioso) / warning UI / lasciare invariato.

### 6 — Permessi
`brands:delete` oggi = hard-delete → diventa soft-delete.
Chi può fare restore? Stesso permesso (`brands:delete`) o `brands:update`?

---

## Complessità

**Media-alta.**
- BE: toccare tutti i service per il filtering automatico
- FE: UI cestino su 6-8 sezioni (brands, collections, colors, products, suppliers, stores, users…)
- Nessuna migrazione DB — la colonna `isActive` c'è già ovunque
