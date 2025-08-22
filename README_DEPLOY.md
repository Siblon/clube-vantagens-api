# Deploy

## Variáveis de ambiente

Defina as seguintes variáveis nas plataformas de deploy:

| Variável | Descrição |
|---------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON` | Chave pública do Supabase |
| `ADMIN_PIN` | PIN exigido em rotas administrativas (`x-admin-pin`) |
| `ALLOWED_ORIGIN` | (opcional) lista de origens CORS permitidas |
| `MP_ACCESS_TOKEN` | (opcional) token do Mercado Pago |
| `MP_COLLECTOR_ID` | (opcional) coletor do Mercado Pago |
| `MP_WEBHOOK_SECRET` | (opcional) segredo para validar webhooks do Mercado Pago |
| `APP_BASE_URL` | (opcional) URL pública usada nos redirecionamentos de pagamento |
| `RAILWAY_URL` | (opcional) URL do deploy no Railway |

## Render
1. Crie um novo serviço **Web Service** e conecte este repositório.
2. Selecione a região `oregon` e o plano gratuito.
3. Aplique as configurações do [`render.yaml`](render.yaml) ou defina manualmente:
   - Build Command: `npm ci`
   - Start Command: `node server.js`
   - Health Check Path: `/health`
   - `NODE_ENV=production`
4. Defina as variáveis de ambiente listadas acima.
5. Salve e faça o deploy.

## Railway
1. Crie um novo projeto -> **Deploy from GitHub** -> selecione este repositório.
2. O [`railway.json`](railway.json) define o uso de **NIXPACKS** e o comando de start `node server.js`.
3. Configure as variáveis de ambiente listadas acima.
4. Inicie o deploy e copie o domínio gerado se precisar expor a URL em outros serviços.
