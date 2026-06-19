#!/usr/bin/env bash
# Backup PostgreSQL e MinIO per rms_prod.
# Uso: ./backup.sh [cartella_destinazione]
# Cron suggerito: 0 3 * * * /home/pier/Scrivania/rms/deploys/prod/backup.sh >> /home/pier/backups/rms/backup.log 2>&1

set -euo pipefail

BACKUP_ROOT="${1:-/home/pier/backups/rms}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_ROOT/$TIMESTAMP"
KEEP_DAYS=30

mkdir -p "$DEST"

echo "[$TIMESTAMP] Avvio backup → $DEST"

# PostgreSQL: dump a caldo (nessun downtime)
echo "  postgres..."
docker exec rms_prod_postgres pg_dump \
  -U "$( docker exec rms_prod_postgres printenv POSTGRES_USER )" \
  "$( docker exec rms_prod_postgres printenv POSTGRES_DB )" \
  | gzip > "$DEST/postgres.sql.gz"

# MinIO: tar del volume montato in container temporaneo
echo "  minio..."
docker run --rm \
  -v rms_prod_minio_data:/data:ro \
  -v "$DEST":/out \
  alpine tar czf /out/minio.tar.gz -C /data .

echo "  fatto: $(du -sh "$DEST" | cut -f1)"

# Rotazione: rimuovi backup più vecchi di KEEP_DAYS giorni
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime "+$KEEP_DAYS" -exec rm -rf {} +

echo "[$TIMESTAMP] Backup completato."
