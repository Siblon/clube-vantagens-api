process.env.NODE_ENV = 'test';
process.env.ADMIN_PIN = '2468';

jest.mock('../supabaseClient', () => {
  const single = jest.fn().mockResolvedValue({ data: { id: 1, nome: 'John', email: 'john@example.com' }, error: null });
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  const from = jest.fn(() => ({ insert }));
  return { supabase: { from }, assertSupabase: () => true };
});

const request = require('supertest');
const app = require('../server');

describe('basic API smoke', () => {
  test('/health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  test('/planos', async () => {
    const res = await request(app).get('/planos');
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
        .send({ nome: 'John', email: 'john@example.com' });
      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.cliente).toBeTruthy();
    });
  });
});
