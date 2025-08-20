# Audit Report

## 1. Mapa de pastas e arquivos relevantes
- `server.js`
- `src/features/`
  - `assinaturas/`
  - `clientes/`
  - `planos/`
- `controllers/`
- `src/routes/`
- `config/`
- `tests/` e `__tests__/`

## 2. Estado atual de server.js
- Exporta `createApp` como função assíncrona.
- `app.listen` executa somente quando `NODE_ENV !== 'test'`.
- Define rotas básicas (`/health`, assinaturas, features e admin).

## 3. Rotas críticas
- `/health`: definida em `server.js` retornando `{ ok: true }`.
- `/status`: `server.js` usa `app.use('/status', status)`, porém `controllers/statusController.js` exporta um objeto comum; não há `Router` configurado ⇒ risco de erro de middleware.
- `/planos`: possui controller, serviço e rotas em `src/features/planos/`.

## 4. Integração com Supabase
- `config/supabase.js` importa `supabaseClient.js` que cria o client com `@supabase/supabase-js`.
- Variáveis de ambiente: `SUPABASE_URL` e `SUPABASE_ANON` (presentes em `.env.example` e `.env.test`).

## 5. Setup de testes
- Jest configurado em `jest.config.js` com `setupFiles: ['dotenv/config']`.
- Não existe `jest.setup.js`.
- Testes distribuídos em `tests/` (diversos) e `__tests__/` (planos).
- Scripts atuais executam Jest com `cross-env`, `DOTENV_CONFIG_PATH=.env.test` e flag `--experimental-vm-modules`.

## 6. Scripts npm principais
- `dev`: `nodemon server.js`
- `start`: `node server.js`
- `test`: comando complexo com `cross-env` e variáveis extras (`DISABLE_MP`)
- `test:watch`: similar ao `test` com `--watch`
- `coverage`: cobertura
- Outros: `test:api`, `vercel:prepare`, `build:meta`, `migrate`, `postinstall`

## 7. Itens de DX
- `scripts/cycle.sh` existente.
- Não há `cycle.ps1`, `.editorconfig` ou `.gitattributes`.
- `.npmrc` presente.
- Não foi encontrado Husky.

## 8. Pontos de risco em Windows
- Ausência de `.gitattributes` e `.editorconfig` ⇒ risco de EOL inconsistentes.
- Scripts shell (`cycle.sh`) podem não rodar nativamente.

## 9. Erros conhecidos
- Log anterior relatou `Cannot find module './planos.service.js'` (hoje serviço existe).
- Rota `/status` pode lançar `Router.use() requires a middleware function but got Object`.
- Instalação de dependências falhou (`E403` ao buscar pacotes no npm).

## 10. Itens de deploy
- `netlify.toml` aponta para proxy da API hospedada na Railway.
- `public/_redirects` contém rewrites para endpoints da API.
- `README_DEPLOY.md` com instruções de deploy (Railway/Netlify).

## Validação final recomendada
1. `git checkout -b codex/diagnose-<YYYYMMDD>`
2. `npm install`
3. `npm test`
4. `npm start` e validar `GET /health` e `GET /planos`

### Endpoints principais
- `GET /health`
- `GET /status`
- `GET /planos`
- `POST /planos` → `{ "nome": "Básico", "descricao": "string", "preco": 1000 }`
- `PUT /planos/:id` → idem POST
- `DELETE /planos/:id`

### Variáveis de ambiente obrigatórias
- `.env` / `.env.test`:
  - `SUPABASE_URL`
  - `SUPABASE_ANON`
  - `ADMIN_PIN`
  - `ALLOWED_ORIGIN`
  - `MP_ACCESS_TOKEN` (teste)
  - `MP_COLLECTOR_ID` (teste)
  - `MP_WEBHOOK_SECRET` (teste)
  - `PLAN_PRICE_BASICO`, `PLAN_PRICE_PRO`, `PLAN_PRICE_PREMIUM`

