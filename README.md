# Clube de Vantagens API

API em Node.js para gerenciamento de planos, clientes e transações.

## Requisitos
- Node.js 20+
- PostgreSQL e [`dbmate`](https://github.com/amacneil/dbmate)

## Variáveis de ambiente
Exemplo mínimo de `.env`:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PIN=2468
DATABASE_URL=postgres://user:pass@localhost/db
ALLOWED_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
```

## Desenvolvimento
```bash
npm install
npm run dev
```

## Testes
```bash
npm test       # Jest + Supertest
npm run coverage
```

## Migrations
- `dbmate up` aplica migrations localmente.
- Em produção a pipeline executa `node scripts/maybe-migrate.cjs` antes de iniciar o server.

## UI Administrativa
Abra `public/transacoes-admin.html`, informe o **PIN** e use os filtros para listar e exportar CSV das transações.

## Smoke tests
```bash
API=http://localhost:8080 PIN=2468 ./scripts/smoke.sh
```
O CSV será salvo como `transacoes.csv`.

## Health check
`GET /health` → `{ ok:true, uptime, version, db }`
