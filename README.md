# Clube de Vantagens API

API em Node.js para gerenciamento de planos, clientes e transações.

## Requisitos
- Node.js 20+
- PostgreSQL e [`dbmate`](https://github.com/amacneil/dbmate)

## Variáveis de ambiente
Criar um `.env` com, no mínimo:
```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=postgres://user:pass@localhost/db
ADMIN_PIN=2468
ALLOWED_ORIGIN=http://localhost:3000
NODE_ENV=development
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

## Deploy (Railway)
A pipeline executa `node scripts/maybe-migrate.cjs` antes de iniciar o server.

## UI Administrativa
Abra `public/transacoes-admin.html`, informe o **PIN** e use os filtros (status, método, datas) para listar e exportar CSV das transações.

## Smoke tests
```bash
API=http://localhost:8080 PIN=2468 ./scripts/smoke.sh
```
O CSV será salvo como `transacoes.csv`.

## Health check
`GET /health` → `{ ok:true, uptime, version, db }`
