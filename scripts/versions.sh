#!/usr/bin/env bash
# Stampa le versioni correnti dei moduli custom.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

backend=$(node -pe 'JSON.parse(require("fs").readFileSync(process.argv[1])).version' "$ROOT/modules/backend/package.json")
frontend=$(node -pe 'JSON.parse(require("fs").readFileSync(process.argv[1])).version' "$ROOT/modules/frontend/package.json")

echo "backend:  v$backend"
echo "frontend: v$frontend"
