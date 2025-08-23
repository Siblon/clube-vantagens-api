# Repository Audit

## Rotas
| Método | Caminho | x-admin-pin |
|--------|---------|-------------|
| GET | /health | - |
| GET | /assinaturas | - |
| GET | /assinaturas/listar | - |
| POST | /admin/assinatura | sim |
| POST | /admin/assinaturas | sim |
| GET | /planos | - |
| GET | /planos/:id | - |
| POST | /planos | - |
| PUT | /planos/:id | - |
| DELETE | /planos/:id | - |
| POST | /public/lead | - |
| GET | /public/leads | sim |
| GET | /public/leads.csv | sim |
| POST | /public/leads/approve | sim |
| POST | /public/leads/discard | sim |
| GET | /status | - |
| GET | /status/supabase | - |
| GET | /metrics | - |
| GET | /metrics/csv | - |
| GET | /transacao/preview | - |
| POST | /transacao | - |
| POST | /admin/seed | sim |
| POST | /admin/clientes/bulk | sim |
| POST | /admin/clientes/generate-ids | sim |
| POST | /admin/clientes | sim |
| GET | /admin/clientes | sim |
| POST | /admin/clientes/bulk | sim |
| DELETE | /admin/clientes/:cpf | sim |
| POST | /admin/clientes/generate-ids | sim |
| GET | /admin/report | sim |
| GET | /admin/report/csv | sim |
| GET | /mp/status * | - |
| POST | /mp/checkout * | - |
| POST | /mp/webhook * | - |

\* rotas de Mercado Pago existem em `controllers/mpController.js`, mas não estão montadas por padrão em `server.js`.

## Serviços / Módulos
- `src/features/assinaturas/assinatura.service.js` – cria assinaturas e calcula preço do plano.
- `src/features/planos/planos.service.js` – CRUD de planos.
- `src/features/clientes/cliente.service.js` – criação de clientes.
- `services/transacoesMetrics.js` – agregação de métricas de transações.
- `controllers/*` – controllers legados para métricas, leads, transações, etc.

## Middlewares
- `src/middlewares/adminPin.js` – valida header `x-admin-pin`.
- `middlewares/errorHandler.js` – tratamento de erros.
- `helmet`, `cors` e `express-rate-limit` configurados em `server.js`.

## Variáveis de Ambiente
- `SUPABASE_URL`, `SUPABASE_ANON`, `ADMIN_PIN`, `ALLOWED_ORIGIN`, `PORT`.
- Integração opcional com Mercado Pago: `MP_ACCESS_TOKEN`, `MP_COLLECTOR_ID`, `MP_WEBHOOK_SECRET`, `APP_BASE_URL`.
- Outros: `RECAPTCHA_SECRET`, `RAILWAY_URL`, `DATABASE_URL`, `PLAN_PRICE_BASICO`, `PLAN_PRICE_PRO`, `PLAN_PRICE_PREMIUM`.

## Testes
- Jest com config em `jest.config.js` e mocks em `jest.setup.js`.
- Testes em `tests/` e `__tests__/`.
- Executar com `npm test`.

## Experiência de Desenvolvimento
- `npm run dev` usa nodemon.
- `npm start` executa `node server.js`.
- VS Code: `.vscode/launch.json` permite depurar com F5.

## CI
- Workflow GitHub Actions `.github/workflows/test.yml` roda `npm test` em Node 22.

## Pontos Frágeis / Dívidas
- Rotas de planos estão públicas (não exigem PIN).
- `mpController` existe mas não é montado no servidor.
- `cliente.repo.js` não implementa `findById`/`findByDocumento`, usados em `assinatura.service.js`.
- Arquivo duplicado `assinatura.routes.js` removido.
- Página "Testar Cadastro" (Netlify) é externa; API não expõe cadastro público.

