const request = require('supertest');
const express = require('express');

jest.mock('../supabaseClient', () => ({
  from: jest.fn(),
  assertSupabase: () => true,
}));

const supabase = require('../supabaseClient');
const metricsController = require('../controllers/metricsController');
const requireAdmin = require('../middlewares/requireAdmin');

const app = express();
app.get('/admin/metrics', requireAdmin, metricsController.resume);

describe('Rotas de métricas', () => {
  beforeEach(() => {
    supabase.from.mockReset();
    process.env.ADMIN_PIN = '1234';
  });

  test('exige PIN de administrador', async () => {
    const res = await request(app).get('/admin/metrics');
    expect(res.status).toBe(401);
  });

  test('retorna resumo com sucesso', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'clientes') {
        return {
          select: jest.fn().mockResolvedValue({
            data: [{ status: 'ativo' }, { status: 'inativo' }],
            error: null,
          }),
        };
      }
      if (table === 'transacoes') {
        return {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {};
    });

    const res = await request(app)
      .get('/admin/metrics')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('clientes');
  });

  test('erro ao consultar banco retorna 500', async () => {
    supabase.from.mockImplementation((table) => {
      if (table === 'clientes') {
        return {
          select: jest.fn().mockResolvedValue({ data: null, error: { message: 'db' } }),
        };
      }
    });

    const res = await request(app)
      .get('/admin/metrics')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(500);
  });
});

