const request = require('supertest');
const express = require('express');

jest.mock('../supabaseClient', () => ({
  supabase: { from: jest.fn() },
  assertSupabase: () => true,
}));

const { supabase, assertSupabase } = require('../supabaseClient');
const leadController = require('../controllers/leadController');

const requireAdmin = (req, res, next) => {
  const pin = req.get('x-admin-pin') || req.query.pin;
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'PIN inválido' });
  }
  next();
};

const app = express();
app.use(express.json());
app.post('/public/lead', leadController.publicCreate);
app.get('/admin/leads', requireAdmin, leadController.adminList);

describe('Rotas de leads', () => {
  beforeEach(() => {
    supabase.from.mockReset();
    process.env.ADMIN_PIN = '1234';
  });

  test('cria lead público com sucesso', async () => {
    supabase.from.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
    });

    const res = await request(app)
      .post('/public/lead')
      .send({ nome: 'João', cpf: '12345678901', plano: 'Mensal' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 1);
  });

  test('validação falha retorna 400', async () => {
    const res = await request(app)
      .post('/public/lead')
      .send({ cpf: '123', plano: 'Mensal' });
    expect(res.status).toBe(400);
  });

  test('rota admin exige pin', async () => {
    const res = await request(app).get('/admin/leads');
    expect(res.status).toBe(401);
  });

  test('lista leads com pin válido', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null, count: 1 }),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    });
    const res = await request(app)
      .get('/admin/leads')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('rows');
  });

  test('erro do banco na listagem admin retorna 500', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: null, error: { message: 'db' }, count: 0 }),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    });
    const res = await request(app)
      .get('/admin/leads')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(500);
  });
});

