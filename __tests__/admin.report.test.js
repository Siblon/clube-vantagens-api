process.env.NODE_ENV = 'test';

let queryResult = { data: [], count: 0, error: null };

const queryBuilder = {
  select: jest.fn(() => queryBuilder),
  eq: jest.fn(() => queryBuilder),
  gte: jest.fn(() => queryBuilder),
  lte: jest.fn(() => queryBuilder),
  order: jest.fn(() => queryBuilder),
  limit: jest.fn(() => queryBuilder),
  then: (resolve) => Promise.resolve(resolve(queryResult)),
};

const supabase = {
  from: jest.fn(() => queryBuilder),
};

jest.mock('../services/supabase', () => supabase);

jest.mock('../middlewares/requireAdminPin', () => (req, res, next) => {
  const pin = req.header('x-admin-pin');
  if (!pin) return res.status(401).json({ ok:false, error:'missing_admin_pin' });
  req.adminId = 1;
  next();
});

const request = require('supertest');
const app = require('../server');

describe('GET /admin/report/summary', () => {
  test('requires PIN', async () => {
    const res = await request(app).get('/admin/report/summary');
    expect(res.status).toBe(401);
  });

  test('returns summary', async () => {
    queryResult = {
      data: [
        { status: 'ativo', plano: 'Essencial', metodo_pagamento: 'pix' },
        { status: 'inativo', plano: 'Essencial', metodo_pagamento: 'cartao_credito' },
        { status: 'ativo', plano: 'Black', metodo_pagamento: 'pix' },
      ],
      count: 3,
      error: null,
    };
    const res = await request(app)
      .get('/admin/report/summary')
      .set('x-admin-pin', '2468');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 3,
      ativos: 2,
      inativos: 1,
      porPlano: { Essencial: 2, Black: 1 },
      porMetodo: { pix: 2, cartao_credito: 1 },
    });
  });
});

describe('GET /admin/report/csv', () => {
  test('requires PIN', async () => {
    const res = await request(app).get('/admin/report/csv');
    expect(res.status).toBe(401);
  });

  test('returns CSV', async () => {
    queryResult = {
      data: [
        {
          created_at: '2023-01-01T00:00:00Z',
          route: '/x',
          action: 'do',
          admin_pin_hash: 'hash',
          admin_id: 1,
          admin_nome: 'Admin',
          client_cpf: '12345678900',
          payload: { a: 1 },
        },
      ],
      error: null,
    };
    const res = await request(app)
      .get('/admin/report/csv')
      .set('x-admin-pin', '2468');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('created_at;rota;action;admin_pin_hash;admin_id;admin_nome;client_cpf;payload');
  });
});
