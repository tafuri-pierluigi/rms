#!/usr/bin/env bash
# Esporta il certificato CA locale generato da Caddy.
# Utile per far fidarsi di HTTPS ai browser su macchine remote.
#
# Uso: ./scripts/export-caddy-ca.sh [local|test]
#
# Installazione su Linux:  sudo cp rms-local-ca.crt /usr/local/share/ca-certificates/ && sudo update-ca-certificates
# Installazione su Windows: doppio click → Installa certificato → Autorità di certificazione radice attendibili
# Installazione su macOS:   sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain rms-local-ca.crt
set -e

ENV="${1:-test}"
CONTAINER="rms_${ENV}_caddy"
OUT="rms-${ENV}-ca.crt"

docker cp "$CONTAINER:/data/caddy/pki/authorities/local/root.crt" "$OUT"
echo "CA esportata in: $OUT"
