#!/usr/bin/env bash
set -euo pipefail

API=${API:-http://localhost:8080}
PIN=${PIN:-2468}
DESDE=${DESDE:-$(date -u +"%Y-%m-01")}
ATE=${ATE:-$(date -u +"%Y-%m-%d")}

echo "== Listando transações"
curl -sS "$API/admin/transacoes?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" | tee /dev/null

echo "== Resumo"
curl -sS "$API/admin/transacoes/resumo?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" | tee /dev/null

echo "== Exportando CSV"
curl -sS "$API/admin/transacoes/csv?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" -o transacoes.csv
cat transacoes.csv | head -n 2

echo "== Patch de status (pago)"
ID=$(curl -sS "$API/admin/transacoes?limit=1" -H "x-admin-pin: $PIN" | jq -r '.rows[0].id')
if [ "$ID" != "null" ]; then
  curl -sS -X PATCH "$API/admin/transacoes/$ID" -H "x-admin-pin: $PIN" -H "Content-Type: application/json" -d '{"status_pagamento":"pago"}' | tee /dev/null
fi

echo "== Planos"
curl -sS "$API/planos" | tee /dev/null

echo "== Renomear plano"
curl -sS -X POST "$API/admin/planos/rename" -H "x-admin-pin: $PIN" -H "Content-Type: application/json" -d '{"from":"A","to":"B"}' | tee /dev/null

echo "== Migrar planos (dry_run)"
curl -sS -X POST "$API/admin/planos/migrar" -H "x-admin-pin: $PIN" -H "Content-Type: application/json" -d '{"from":"A","to":"B","dry_run":true}' | tee /dev/null

echo "Smoke completed"
