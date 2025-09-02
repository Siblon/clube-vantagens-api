process.env.NODE_ENV = 'test';

jest.mock('../services/supabase', () => {
  const single = jest.fn().mockResolvedValue({ data: { id: 1 }, error: null });
  const select = jest.fn(() => ({ single }));
  const upsert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ upsert }));
  return { from };
});

jest.mock('../middlewares/requireAdminPin', () => (req, res, next) => {
  const pin = req.header('x-admin-pin');
  if (!pin) return res.status(401).json({ ok:false, error:'missing_admin_pin' });
  req.adminId = 1;
  next();
});

const request = require('supertest');
const app = require('../server');

describe('basic API smoke', () => {
  test('/health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  describe('/admin/clientes', () => {
    test('rejects without PIN', async () => {
      const res = await request(app)
        .post('/admin/clientes')
        .send({ nome: 'John', email: 'john@example.com' });
      expect(res.status).toBe(401);
    });

    test('creates with PIN', async () => {
      const res = await request(app)
        .post('/admin/clientes')
        .set('x-admin-pin', '2468')
        .send({
          cpf: '02655274148',
          nome: 'John',
          plano: 'Essencial',
          status: 'ativo',
          metodo_pagamento: 'pix'
        });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toBeTruthy();
    });
  });
});
