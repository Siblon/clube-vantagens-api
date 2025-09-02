const request = require('supertest');
const express = require('express');

jest.mock('../services/supabase', () => ({
  from: jest.fn(),
}));

const supabase = require('../services/supabase');
const assinaturaController = require('../controllers/assinaturaController');

const app = express();
app.get('/assinaturas', assinaturaController.consultarPorIdentificador);

describe('Rotas de assinaturas', () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  test('retorna dados para cliente ativo', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { nome: 'João', plano: 'Mensal', status: 'ativo' },
        error: null,
      }),
    });

    const res = await request(app)
      .get('/assinaturas')
      .query({ cpf: '02655274148' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('nome', 'João');
  });

  test('cpf inválido retorna 400', async () => {
    const res = await request(app)
      .get('/assinaturas')
      .query({ cpf: '123' });
    expect(res.status).toBe(400);
  });

  test('cliente não encontrado retorna 404', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });
    const res = await request(app)
      .get('/assinaturas')
      .query({ cpf: '02655274148' });
    expect(res.status).toBe(404);
  });

  test('erro do banco retorna 500', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      }),
    });
    const res = await request(app)
      .get('/assinaturas')
      .query({ cpf: '02655274148' });
    expect(res.status).toBe(500);
  });
});

