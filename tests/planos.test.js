const request = require('supertest');
const express = require('express');
const errorHandler = require('../middlewares/errorHandler');

// Fake in-memory database
const initialPlanos = [
  { id: 1, nome: 'Basico', desconto_percent: 5, ativo: true, prioridade: 1 },
  { id: 2, nome: 'Gold', desconto_percent: 10, ativo: true, prioridade: 2 },
  { id: 3, nome: 'Platinum', desconto_percent: 20, ativo: true, prioridade: 3 },
];
const initialClientes = [
  {
    id: 1,
    cpf: '11122233344',
    nome: 'Fulano',
    plano: 'Gold',
    status_pagamento: 'ok',
    vencimento: null,
  },
];

const fakeDb = {
  planos: [],
  clientes: [],
  nextPlanId: 1,
};

class FakeQuery {
  constructor(table) {
    this.table = table;
    this.action = 'select';
    this.payload = null;
    this.filters = [];
    this.orders = [];
    this.rangeArgs = null;
    this.fields = null;
    this.singleResult = false;
    this.options = {};
  }
  select(fields, opts) {
    this.fields = fields;
    this.options = opts || {};
    return this;
  }
  insert(payload) {
    this.action = 'insert';
    this.payload = payload;
    return this;
  }
  update(patch) {
    this.action = 'update';
    this.payload = patch;
    return this;
  }
  eq(col, val) {
    this.filters.push({ type: 'eq', col, val });
    return this;
  }
  ilike(col, pattern) {
    this.filters.push({ type: 'ilike', col, pattern });
    return this;
  }
  order(col, { ascending } = { ascending: true }) {
    this.orders.push({ col, ascending: ascending !== false });
    return this;
  }
  range(start, end) {
    this.rangeArgs = { start, end };
    return this;
  }
  single() {
    this.singleResult = true;
    return this;
  }
  maybeSingle() {
    this.singleResult = true;
    return this;
  }
  then(resolve, reject) {
    try {
      const result = this.execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err); else resolve({ data: null, error: err });
    }
  }
  execute() {
    let rows = fakeDb[this.table].slice();
    for (const f of this.filters) {
      if (f.type === 'eq') {
        rows = rows.filter((r) => r[f.col] === f.val);
      } else if (f.type === 'ilike') {
        const regex = new RegExp(f.pattern.replace(/%/g, '.*'), 'i');
        rows = rows.filter((r) => regex.test(r[f.col] || ''));
      }
    }
    if (this.action === 'insert') {
      const vals = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted = vals.map((v) => {
        const row = { id: fakeDb.nextPlanId++, ...v };
        fakeDb[this.table].push(row);
        return row;
      });
      rows = inserted;
    } else if (this.action === 'update') {
      rows.forEach((r) => Object.assign(r, this.payload));
    }
    if (this.orders.length) {
      rows.sort((a, b) => {
        for (const o of this.orders) {
          if (a[o.col] === b[o.col]) continue;
          return (a[o.col] > b[o.col] ? 1 : -1) * (o.ascending ? 1 : -1);
        }
        return 0;
      });
    }
    if (this.rangeArgs) {
      rows = rows.slice(this.rangeArgs.start, this.rangeArgs.end + 1);
    }
    if (this.fields && this.fields !== '*') {
      const fields = this.fields.split(',').map((f) => f.trim());
      rows = rows.map((r) => {
        const obj = {};
        fields.forEach((f) => (obj[f] = r[f]));
        return obj;
      });
    }
    const count = this.options && this.options.count === 'exact' ? rows.length : undefined;
    let data = rows;
    if (this.singleResult) data = rows[0] || null;
    return { data, error: null, count };
  }
}

jest.mock('../services/supabase', () => ({
  from: (table) => new FakeQuery(table),
}));

const planosPublicRoutes = require('../routes/planos.public.routes');
const planosAdminRoutes = require('../routes/planos.admin.routes');
const transacaoController = require('../controllers/transacaoController');

const ADMIN_PIN = process.env.ADMIN_PIN || '2468';

let app;

beforeEach(() => {
  // reset fake database
  fakeDb.planos = initialPlanos.map((p) => ({ ...p }));
  fakeDb.clientes = initialClientes.map((c) => ({ ...c }));
  fakeDb.nextPlanId = initialPlanos.length + 1;

  app = express();
  app.use(express.json());
  const requireAdminPin = (req, res, next) => {
    if (req.headers['x-admin-pin'] !== ADMIN_PIN) return res.status(401).json({ error: 'missing_admin_pin' });
    next();
  };
  app.use('/planos', planosPublicRoutes);
  app.use('/admin/planos', requireAdminPin, planosAdminRoutes);
  app.use('/transacao', transacaoController);
  app.use(errorHandler);
});

describe('Planos API', () => {
  test('GET /planos retorna nomes de planos ativos', async () => {
    const res = await request(app).get('/planos');
    expect(res.status).toBe(200);
    expect(res.body.planos).toEqual(['Platinum', 'Gold', 'Basico']);
    expect(res.body.planos.length).toBeGreaterThanOrEqual(3);
  });

  test('CRUD admin de planos', async () => {
    // cria plano Silver
    const createRes = await request(app)
      .post('/admin/planos')
      .set('x-admin-pin', ADMIN_PIN)
      .send({ nome: 'Silver', desconto_percent: 12.34 });
    expect(createRes.status).toBe(200);
    const id = createRes.body.data.id;

    // adiciona cliente para testar rename sem propagação
    fakeDb.clientes.push({ id: 2, cpf: '22233344455', nome: 'Cliente Silver', plano: 'Silver', status_pagamento: 'ok', vencimento: null });

    // lista
    const listRes = await request(app)
      .get('/admin/planos')
      .set('x-admin-pin', ADMIN_PIN);
    expect(listRes.status).toBe(200);
    expect(listRes.body.rows.some((p) => p.nome === 'Silver')).toBe(true);

    // atualiza percentual
    const updRes = await request(app)
      .patch(`/admin/planos/${id}`)
      .set('x-admin-pin', ADMIN_PIN)
      .send({ desconto_percent: 15 });
    expect(updRes.status).toBe(200);
    expect(updRes.body.data.desconto_percent).toBe(15);

    // renomeia sem propagar
    const renRes = await request(app)
      .post('/admin/planos/rename')
      .set('x-admin-pin', ADMIN_PIN)
      .send({ from: 'Silver', to: 'Silver X' });
    expect(renRes.status).toBe(200);
    const clientSilver = fakeDb.clientes.find((c) => c.cpf === '22233344455');
    expect(clientSilver.plano).toBe('Silver');

    // verifica rename na listagem
    const list2 = await request(app)
      .get('/admin/planos')
      .set('x-admin-pin', ADMIN_PIN);
    const renamed = list2.body.rows.find((p) => p.id === id);
    expect(renamed.nome).toBe('Silver X');

    // inativa plano
    const inactRes = await request(app)
      .patch(`/admin/planos/${id}`)
      .set('x-admin-pin', ADMIN_PIN)
      .send({ ativo: false });
    expect(inactRes.status).toBe(200);
    expect(inactRes.body.data.ativo).toBe(false);
  });

  test('GET /transacao/preview aplica desconto do plano', async () => {
    const res = await request(app)
      .get('/transacao/preview')
      .query({ cpf: '11122233344', valor: '200' });
    expect(res.status).toBe(200);
    expect(res.body.descontoPercent).toBe(10);
    expect(res.body.valorFinal).toBe(180);
  });
});

