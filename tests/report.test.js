const request = require('supertest');
const express = require('express');

jest.mock('../services/supabase', () => ({
  from: jest.fn(),
}));

jest.mock('../services/transacoesMetrics', () => ({
  periodFromQuery: jest.fn(() => ({
    from: new Date('2024-01-01T00:00:00Z'),
    to: new Date('2024-01-31T00:00:00Z'),
  })),
  iso: jest.fn((d) => d.toISOString()),
  aggregate: jest.fn(() => ({
    qtdTransacoes: 1,
    bruto: 100,
    descontos: 10,
    liquido: 90,
    porPlano: {},
    porCliente: {},
  })),
}));

const supabase = require('../services/supabase');
const reportController = require('../controllers/reportController');

const app = express();
app.get('/relatorios/resumo', reportController.resumo);
app.get('/relatorios/csv', reportController.csv);

beforeEach(() => {
  supabase.from.mockReset();
});

describe('Report Controller', () => {
  test('resumo retorna métricas', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: [], error: null }),
    };
    supabase.from.mockReturnValue(query);

    const res = await request(app).get('/relatorios/resumo');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalBruto', 100);
  });

  test('resumo erro do banco retorna 500', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: null, error: { message: 'db' } }),
    };
    supabase.from.mockReturnValue(query);

    const res = await request(app).get('/relatorios/resumo');
    expect(res.status).toBe(500);
  });

  test('csv retorna conteúdo', async () => {
    const row = {
      id: 1,
      created_at: '2024-01-01',
      cpf: '123',
      cliente_nome: 'Fulano',
      plano: 'Mensal',
      valor_bruto: 10,
      desconto_aplicado: 0,
      valor_final: 10,
      origem: 'web',
    };
    const query = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: [row], error: null }),
    };
    supabase.from.mockReturnValue(query);

    const res = await request(app).get('/relatorios/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('id,created_at,cpf');
    expect(res.text).toContain('Fulano');
  });

  test('csv erro do banco retorna 500', async () => {
    const query = {
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      then: (resolve) => resolve({ data: null, error: { message: 'db' } }),
    };
    supabase.from.mockReturnValue(query);

    const res = await request(app).get('/relatorios/csv');
    expect(res.status).toBe(500);
  });
});

