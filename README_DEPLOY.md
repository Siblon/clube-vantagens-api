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

## Testes
- Abrir /deploy-check.html no site da Vercel
- Ver se /health responde e rewrites funcionam
