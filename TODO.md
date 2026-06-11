# RMS — Backlog & Issues aperti

> Aggiornato: 2026-06-11

---

## 🔴 Bug da risolvere

### PO — Prezzo a 0 dopo aggiunta prodotto
Il prezzo di costo viene calcolato correttamente nel form bozza (con ricarico → prezzo di vendita), ma quando si fa "Aggiungi all'ordine" il valore viene perso e la variante viene inserita a `costPrice: 0`. L'utente deve correggerlo via modifica inline.
Stesso sintomo in fase di vendita: il prezzo di un prodotto appare a 0 nella cassa anche se l'ordine di acquisto ricevuto ha il costo originale con ricarico.
**Da verificare:** se dipende solo dal FE o anche dal BE (variante con `sellingPrice` non aggiornato dopo receive).

### PO — Form bozza schiacciato in verticale con prodotti già presenti
Quando è già stato aggiunto almeno un prodotto e si apre la bozza per aggiungerne un secondo, il pannello della bozza risulta troppo stretto verticalmente.

### PO — Cancellazione con merce parzialmente ricevuta
Se un ordine è in stato `PartiallyReceived` e si forza la cancellazione, la merce già ricevuta e caricata in inventario dovrebbe essere gestita esplicitamente.
**Proposta:** popup di conferma che avverta l'utente e chieda se la merce ricevuta va stornata dall'inventario oppure mantenuta.

---

## 🟡 Feature mancanti / incomplete

### Dettaglio Reso Fornitore
La vista di dettaglio del reso fornitore non mostra ancora la lista dei prodotti resi né l'importo rimborsato. Va costruita.

### Reso Fornitore — solo merce ricevuta
La logica di business corretta è: si può rendere solo la merce effettivamente arrivata (ordini in stato `PartiallyReceived` o `Received`). Verificare che il BE lo validi e che il FE proponga solo le righe ricevute.

### Rettifica stock → transazione di rimborso
Una rettifica negativa (es. merce mancante, danneggiata) dovrebbe poter generare in modo opzionale una transazione di rimborso o nota di credito verso il fornitore. Collegamento tra modulo magazzino e gestione finanziaria.

### Gestione finanziaria (transazioni)
Serve un riepilogo di cassa completo: totale incassato, crediti aperti (buoni/store credit), rimborsi, saldo netto — per giornata, mese e anno. Oggi le vendite vengono registrate ma non esiste una vista aggregata di tipo "chiusura cassa".

---

## 🔵 UX / Design

### Navigazione sidebar — hover instabile
Quando si passa il mouse su un esagono/modulo nella home, l'icona si sposta leggermente e se il cursore esce dall'area (specialmente con moduli a una sola sottovoce, che si spostano di più) il menu si richiude prima che l'utente possa cliccare.
**Proposta:**
- Sidebar chiusa di default sul bordo sinistro (solo il logo visibile)
- Al click sul logo o all'hover: apre mostrando gli esagoni
- Il resto dello schermo è dedicato interamente al contenuto intramodulo (tabelle e form si espandono al 100% orizzontale)

---

## ⚪ Architettura / Tech debt

### Race condition e consistenza dati
Il sistema deve essere robusto rispetto a richieste concorrenti (es. due vendite simultanee sullo stesso articolo con 1 pezzo in stock). 
**Da analizzare:** transazioni DB con locking pessimistico o ottimistico sulle operazioni di stock, idempotency key sulle vendite, retry logic sul FE.

### Paginazione lato backend
Attualmente il FE carica tutte le entità in una sola chiamata. Spostare `page`/`limit` al BE sulle entity principali (products, purchase-orders, customers, transactions).

### Soft-delete
Sfruttare `isActive` già presente su tutte le entità per implementare un soft-delete con cestino recuperabile. Piano dettagliato in `SOFT-DELETE-PLAN.md`.

### Upload immagini MinIO — URL firmati (presigned)
Le immagini sono oggi su bucket pubblico (URL accessibile senza auth). Per dati sensibili valutare presigned URL o proxy auth via Caddy. Non urgente per staging, da affrontare prima del go-live con dati reali.
