const request = require('supertest');
const express = require('express');

jest.mock('../services/supabase', () => ({
  from: jest.fn(),
}));
jest.mock('../middlewares/requireAdminPin.js', () => (req, res, next) => {
  const pin = req.header('x-admin-pin');
  return pin === '1234' ? next() : res.status(401).json({ ok:false, error:'invalid_pin' });
});

const supabase = require('../services/supabase');
const planosPublicRoutes = require('../routes/planos.public.routes.js');
const planosAdminRoutes  = require('../routes/planos.admin.routes.js');
const requireAdminPin = require('../middlewares/requireAdminPin.js');

const app = express();
app.use(express.json());
app.use('/planos', planosPublicRoutes);
app.use('/admin/planos', requireAdminPin, planosAdminRoutes);

describe('Planos Routes', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('GET /planos - lista nomes ativos', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      data: [{ nome: 'Essencial' }, { nome: 'Platinum' }, { nome: 'Black' }],
      error: null,
    };
    supabase.from.mockReturnValue(builder);
    const res = await request(app).get('/planos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, planos: ['Essencial', 'Platinum', 'Black'] });
  });

  test('POST /admin/planos - cria plano', async () => {
    supabase.from.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
        })
      })
    });
    const res = await request(app)
      .post('/admin/planos')
      .set('x-admin-pin', '1234')
      .send({ nome: 'A', desconto_percent: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('POST /admin/planos sem PIN retorna 401', async () => {
    const res = await request(app)
      .post('/admin/planos')
      .send({ nome: 'A', desconto_percent: 10 });
    expect(res.status).toBe(401);
  });

  test('POST /admin/planos com PIN inválido retorna 401', async () => {
    const res = await request(app)
      .post('/admin/planos')
      .set('x-admin-pin', '0000')
      .send({ nome: 'A', desconto_percent: 10 });
    expect(res.status).toBe(401);
  });

  test('PATCH /admin/planos/:id - atualiza plano', async () => {
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: { id: 1 }, error: null })
        })
      })
    });
    const res = await request(app)
      .patch('/admin/planos/1')
      .set('x-admin-pin', '1234')
      .send({ nome: 'B' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('POST /admin/planos/rename - renomeia plano', async () => {
    supabase.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    });
    const res = await request(app)
      .post('/admin/planos/rename')
      .set('x-admin-pin', '1234')
      .send({ from: 'A', to: 'B' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('DELETE /admin/planos/:id remove plano sem clientes', async () => {
    const builderPlanos = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1, nome: 'A' }, error: null }),
    };
    const builderClientes = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ count: 0, error: null }),
    };
    const builderDelete = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    supabase.from
      .mockReturnValueOnce(builderPlanos)
      .mockReturnValueOnce(builderClientes)
      .mockReturnValueOnce(builderDelete);

    const res = await request(app)
      .delete('/admin/planos/1')
      .set('x-admin-pin', '1234');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(builderDelete.delete).toHaveBeenCalled();
  });

  test('POST /admin/planos/rename com update_clientes', async () => {
    const builderPlanos = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    const builderClientes = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };
    supabase.from
      .mockReturnValueOnce(builderPlanos)
      .mockReturnValueOnce(builderClientes);

    const res = await request(app)
      .post('/admin/planos/rename')
      .set('x-admin-pin', '1234')
      .send({ from: 'A', to: 'B', update_clientes: true });

    expect(res.status).toBe(200);
    expect(builderClientes.update).toHaveBeenCalledWith({ plano: 'B' });
  });

  test('POST /admin/planos/migrar com dry_run retorna preview', async () => {
    const builderPlanos = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [{ id: 2, nome: 'B' }], error: null }),
    };
    const builderClientes = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve) => Promise.resolve(resolve({ count: 3, error: null })),
    };
    supabase.from
      .mockReturnValueOnce(builderPlanos)
      .mockReturnValueOnce(builderClientes);

    const res = await request(app)
      .post('/admin/planos/migrar')
      .set('x-admin-pin', '1234')
      .send({ from: 'A', to: 'B', dry_run: true, only_status: 'ativo' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, preview: true, from: 'A', to: 'B', only_status: 'ativo', count: 3 });
  });
});
