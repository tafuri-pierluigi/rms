# Inizializzazione Submodules

Dopo aver clonato il repository `rms`, eseguire i seguenti comandi per scaricare i submodules.

## Configurazione credenziali locali (solo la prima volta)

Questi comandi configurano Git per usare credenziali separate per questo repository:

```bash
git config --local credential.https://github.com.useHttpPath true
git config --local credential.helper "manager"
git submodule sync
```

## Download submodules

```bash
git submodule update --init --recursive
```

Al primo accesso si aprirà il browser per il login con l'account GitHub corretto.

## Comando unico (clone + submodules)

Se devi clonare da zero:

```bash
git clone --recurse-submodules https://github.com/tafuri-pierluigi/rms.git
```
