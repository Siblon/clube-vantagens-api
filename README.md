# Clube de Vantagens API

API em Node.js para gerenciamento de assinaturas, transações e administração de um clube de vantagens. Utiliza [Express](https://expressjs.com/) e [Supabase](https://supabase.com/) como backend.

## Arquitetura
- **Express** para rotas e middleware.
- **Supabase** para persistência de dados (`supabaseClient.js`).
- **Mercado Pago** opcional para pagamentos (`controllers/mpController.js`).
- **Páginas estáticas** em `public/` servidas pelo Express.

## Variáveis de Ambiente
| Variável | Descrição |
|---------|-----------|
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON` | Chave pública do Supabase |
| `ADMIN_PIN` | PIN exigido em rotas administrativas (`x-admin-pin`) |
| `PORT` | Porta do servidor (padrão 3000) |
| `ALLOWED_ORIGIN` | Lista de origens CORS permitidas separadas por vírgula (ex.: `https://site1.com,https://site2.com`). Use `*` para liberar todos os domínios; se omitida, CORS é desativado |
| `RECAPTCHA_SECRET` | Chave do reCAPTCHA usada na captura de leads |
| `MP_ACCESS_TOKEN` | Token de acesso do Mercado Pago |
| `MP_COLLECTOR_ID` | ID do coletor Mercado Pago |
| `MP_WEBHOOK_SECRET` | Segredo usado para validar webhooks do Mercado Pago |
| `APP_BASE_URL` | URL pública do front utilizada nos redirecionamentos de pagamento |
| `RAILWAY_URL` | URL do deploy no Railway (referenciada em `scripts/patch-vercel.js`) |
| `DATABASE_URL` | String de conexão PostgreSQL usada pelo `dbmate` |
| `PLAN_PRICE_BASICO` | Preço do plano Básico em centavos (padrão 4990) |
| `PLAN_PRICE_PRO` | Preço do plano Pro em centavos (padrão 9990) |
| `PLAN_PRICE_PREMIUM` | Preço do plano Premium em centavos (padrão 14990) |

## Planos e descontos
| Plano | Desconto |
|-------|----------|
| Mensal | 10% |
| Semestral | 15% |
| Anual | 30% |

## Rotas Principais
- `GET /health` – Health check da API.
- `GET /assinaturas?cpf=<cpf>` – Consulta assinatura pelo CPF.
- `GET /assinaturas/listar` – Lista todas as assinaturas.
- `GET /planos` – Lista os planos disponíveis.
- `POST /planos` – Cria plano (requer `x-admin-pin`).
- `PUT /planos/:id` – Atualiza plano (requer `x-admin-pin`).
- `DELETE /planos/:id` – Remove plano (requer `x-admin-pin`).
- `POST /public/lead` – Captura leads do site público.
- `GET /admin/clientes` – Lista clientes (requer `x-admin-pin`).
- `GET /admin/metrics` – Resumo de métricas (requer `x-admin-pin`).
- `POST /admin/seed` – Carga inicial de dados (requer `x-admin-pin`).
- `GET /mp/status` – Status da integração com Mercado Pago.

## Rotas Administrativas (`/admin/*`)
Todas as rotas administrativas exigem o cabeçalho `x-admin-pin` com o valor
definido na variável de ambiente `ADMIN_PIN`.

Exemplos de endpoints:

- `GET /admin/clientes` – lista clientes cadastrados.
- `GET /admin/metrics` – resumo de métricas do sistema.
- `POST /admin/seed` – carga inicial de dados.

Exemplo de chamada:

```bash
curl http://localhost:3000/admin/clientes \
  -H "x-admin-pin: SEU_PIN"
```

## Rotas Mercado Pago (`/mp/*`)
Endpoints relacionados a pagamentos com o Mercado Pago.

- `GET /mp/status` – verifica a integração.
- `POST /mp/checkout` – cria um link de pagamento. Requer corpo JSON com
  `externalReference` (ID da transação).
- `POST /mp/webhook?secret=MP_WEBHOOK_SECRET` – recebe notificações de
  pagamentos.

Exemplo de checkout:

```bash
curl -X POST http://localhost:3000/mp/checkout \
  -H "Content-Type: application/json" \
  -d '{"externalReference":"ID_TRANSACAO"}'
```

## Exemplos de Requisições
```bash
# Health check
curl http://localhost:3000/health

# Criar lead público
curl -X POST http://localhost:3000/public/lead \
  -H "Content-Type: application/json" \
  -d '{"nome":"Fulano","email":"fulano@example.com"}'

# Listar clientes (admin)
curl http://localhost:3000/admin/clientes \
  -H "x-admin-pin: SEU_PIN"
```

## Páginas Administrativas (`public/`)
A API expõe páginas estáticas acessíveis diretamente pelo navegador:

- `/` – dashboard com resumo de métricas.
- `/admin/cadastro.html` – cadastro rápido de clientes.
- `/admin/assinatura.html` – criação de novas assinaturas.
- `/painel.html` – painel de transações legado.
- `/dashboard.html` – painel de visão geral legado.
- `/clientes-admin.html` – gerenciamento de clientes.
- `/leads-admin.html` – administração de leads.
- `/relatorios.html` – geração de relatórios CSV.
- `/etiquetas.html` – impressão de etiquetas.
- `/config.html` – configurações diversas.

As páginas de administração exibem um campo de **PIN** no topo. O PIN é
armazenado em `sessionStorage` e enviado automaticamente como cabeçalho
`x-admin-pin` nas requisições. Se o PIN estiver ausente ou incorreto, uma
mensagem de erro é exibida.

O dashboard inicial mostra métricas básicas do endpoint
`GET /admin/report`, como quantidade de transações, valores bruto e
líquido e o total de clientes cadastrados.

## Migrações
Este projeto utiliza [dbmate](https://github.com/amacneil/dbmate) para versionar o schema do banco.

- As migrações estão em `db/migrations`.
- Para aplicar migrações pendentes, execute `npm run migrate` (requer `DATABASE_URL`).
- Durante o deploy, `npm install` aciona `npm run migrate` automaticamente.

## Deploy/Infra

- A API roda no Railway em: https://clube-vantagens-api-production.up.railway.app
- O site no Netlify consome a API via os proxies de [`netlify.toml`](netlify.toml) usando caminhos relativos (`/api`, `/admin`, `/planos`).
- Em desenvolvimento local, execute `npm run dev` (nodemon) e o front acessa `http://localhost:3000` diretamente.

## Como testar pelo Netlify (proxy p/ Railway)

Use o site publicado no Netlify para alcançar a API do Railway por meio dos proxies definidos em `netlify.toml`.

```bash
# Health check
curl https://clube-vantagens-gng.netlify.app/api/health

# Listar planos
curl https://clube-vantagens-gng.netlify.app/planos

# Criar plano (requer cabeçalho x-admin-pin)
curl -X POST https://clube-vantagens-gng.netlify.app/planos \
  -H "Content-Type: application/json" \
  -H "x-admin-pin: SEU_PIN" \
  -d '{"nome":"netlify-demo","preco_centavos":1234}'

# Confirmar criação
curl https://clube-vantagens-gng.netlify.app/planos
```

## Deploy

### Railway

1. Crie um projeto no [Railway](https://railway.app/) a partir deste repositório.
2. O build utiliza `npm ci` (ver `railway.json`), portanto o `package-lock.json` precisa estar versionado.
3. Configure as variáveis de ambiente obrigatórias (`SUPABASE_URL`, `SUPABASE_ANON`, `ADMIN_PIN`, `DATABASE_URL` etc.) e defina `ALLOWED_ORIGIN` com as origens permitidas.
4. Após o deploy, verifique `https://SEU-APP.up.railway.app/health` – a resposta deve ser `{ "ok": true }`.

### Netlify

Para consumir a API a partir do frontend hospedado na Netlify, adicione redirects no `netlify.toml`:

```toml
[[redirects]]
from = "/api/*"
to = "https://SEU-APP.up.railway.app/:splat"
status = 200
force = true

[[redirects]]
from = "/admin/*"
to = "https://SEU-APP.up.railway.app/admin/:splat"
status = 200
force = true

[[redirects]]
from = "/planos/*"
to = "https://SEU-APP.up.railway.app/planos/:splat"
status = 200
force = true
```

```bash
npm install
npm start
```
