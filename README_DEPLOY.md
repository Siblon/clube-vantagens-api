# Deploy no Railway e Vercel

## Railway
1. Criar novo projeto → **Deploy from GitHub** → escolher este repositório.
2. Em **Variables**, adicionar:
   - `SUPABASE_URL=...`
   - `SUPABASE_ANON=...`
   - `ADMIN_PIN=...`
   - (opcional) `MP_ACCESS_TOKEN=...` (para usar Mercado Pago depois)
3. Deploy automático. Copiar o domínio gerado (ex.: `https://xxxxx.up.railway.app`).

## Vercel
1. **New Project** → **Import Git** → escolher este repositório.
2. Framework: `Other`. Em **Build & Output Settings**, definir `Build Command: npm run vercel:prepare`.
3. Em **Environment Variables**, definir `RAILWAY_URL=https://SEUAPP.up.railway.app`. Opcional: `ALLOWED_ORIGIN=https://SEUSITE.vercel.app`.
4. Deploy. Teste abrindo o site e usando a página inicial (`/deploy-check.html`). As chamadas `/transacao`, etc. serão reescritas automaticamente para o domínio do Railway.

## Checklist
- `/health` no domínio da Vercel deve responder `{"ok": true}` (via rewrite).
- Na UI, consultar CPF e registrar transação → conferir tabela `transacoes` no Supabase.

## Domínio customizado
- Na Vercel → **Settings → Domains** → adicionar o domínio do cliente.
- Se quiser `www` + raiz, configurar os registros `CNAME`/`A` conforme instruções da Vercel.
