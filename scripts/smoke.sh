#!/usr/bin/env bash
set -euo pipefail

API=${API:-"https://clube-vantagens-api-production.up.railway.app"}
PIN=${PIN:-"2468"}
DESDE=${DESDE:-$(date -I -d "2 days ago" 2>/dev/null || date -v -2d +%Y-%m-%d)}
ATE=${ATE:-$(date -I 2>/dev/null || date +%Y-%m-%d)}

echo "== Listando transações"
curl -sS "$API/admin/transacoes?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" | tee /dev/null

echo "== Resumo"
curl -sS "$API/admin/transacoes/resumo?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" | tee /dev/null

echo "== Resumo pago"
curl -sS "$API/admin/transacoes/resumo?status=pago&desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" | tee /dev/null

echo "== Exportando CSV"
curl -sS "$API/admin/transacoes/csv?desde=$DESDE&ate=$ATE" -H "x-admin-pin: $PIN" -o transacoes.csv
head -n 2 transacoes.csv

echo "== Patch ida-e-volta"
ID=$(curl -sS "$API/admin/transacoes?limit=1" -H "x-admin-pin: $PIN" | jq -r '.rows[0].id')
if [ "$ID" != "null" ]; then
  curl -sS -X PATCH "$API/admin/transacoes/$ID" \
    -H "x-admin-pin: $PIN" \
    -H "Content-Type: application/json" \
    -d '{"status_pagamento":"pago"}' | tee /dev/null
  curl -sS -X PATCH "$API/admin/transacoes/$ID" \
    -H "x-admin-pin: $PIN" \
    -H "Content-Type: application/json" \
    -d '{"status_pagamento":"pendente"}' | tee /dev/null
fi

echo "== Planos"
curl -sS "$API/planos" | tee /dev/null

echo "== Renomear plano"
curl -sS -X POST "$API/admin/planos/rename" \
  -H "x-admin-pin: $PIN" \
  -H "Content-Type: application/json" \
  -d '{"from":"A","to":"B"}' | tee /dev/null

echo "== Migrar planos (dry_run)"
curl -sS -X POST "$API/admin/planos/migrar" \
  -H "x-admin-pin: $PIN" \
  -H "Content-Type: application/json" \
  -d '{"from":"A","to":"B","dry_run":true}' | tee /dev/null

echo "Smoke completed"
