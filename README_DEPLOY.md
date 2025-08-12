# Deploy

## Railway
- Create New Project -> Deploy from GitHub -> repo atual
- Variables: SUPABASE_URL, SUPABASE_ANON, ADMIN_PIN, RAILWAY_URL, (opcional ALLOWED_ORIGIN)
- Copiar o domínio do Railway em RAILWAY_URL

## Vercel
- New Project -> Import Git -> repo atual
- Framework: "Other"
- Build Command: npm run vercel:prepare
- Environment Variable: RAILWAY_URL=https://SEUAPP.up.railway.app
- (opcional) ALLOWED_ORIGIN=https://SEUSITE.vercel.app ou dominio final

## Mercado Pago (prod)
- Variables: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, APP_BASE_URL
- MP_WEBHOOK_SECRET deve coincidir com a query `?secret=...` recebida no webhook
- APP_BASE_URL é a URL pública do front (Netlify) usada nos redirecionamentos success/failure/pending
- Fluxo:
  1. POST `/mp/checkout` com `{ cpf, amount, desc }`
  2. Cliente é redirecionado ao `init_point` retornado
  3. Mercado Pago chama `/mp/webhook?secret=...` após atualização do pagamento
  4. Quando `status === approved`, atualizamos `status_pagamento` e registramos em `transacoes`

## Testes
- Abrir /deploy-check.html no site da Vercel
- Ver se /health responde e rewrites funcionam
