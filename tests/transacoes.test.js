const request = require('supertest');
const express = require('express');

jest.mock('../supabaseClient', () => ({
  supabase: { from: jest.fn() },
  assertSupabase: () => true,
}));

const { supabase, assertSupabase } = require('../supabaseClient');
const transacaoController = require('../controllers/transacaoController');
const errorHandler = require('../middlewares/errorHandler.js');

const app = express();
app.use(express.json());
app.use('/transacao', transacaoController);
app.use(errorHandler);

describe('Rotas de transações', () => {
  beforeEach(() => {
    supabase.from.mockReset();
  });

  describe('GET /transacao/preview', () => {
    test('retorna preview com desconto', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { nome: 'João', plano: 'Mensal' },
          error: null,
        }),
      });

      const res = await request(app)
        .get('/transacao/preview')
        .query({ cpf: '12345678901', valor: '100,00' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('descontoPercent', 10);
      expect(res.body).toHaveProperty('valorFinal', 90);
    });

    test('dados inválidos retornam 400', async () => {
      const res = await request(app)
        .get('/transacao/preview')
        .query({ cpf: 'abc', valor: '100' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'CPF inválido');
    });

    test('cliente não encontrado retorna 404', async () => {
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const res = await request(app)
        .get('/transacao/preview')
        .query({ cpf: '12345678901', valor: '100' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /transacao', () => {
    test('cria transação com sucesso', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'clientes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { nome: 'João', plano: 'Anual' },
              error: null,
            }),
          };
        }
        if (table === 'transacoes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { id: 1 },
              error: null,
            }),
          };
        }
        return {};
      });

      const res = await request(app)
        .post('/transacao')
        .send({ cpf: '12345678901', valor: 100 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('valor_final', 70);
    });

    test('dados inválidos retornam 400', async () => {
      const res = await request(app)
        .post('/transacao')
        .send({ cpf: 'abc', valor: 100 });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'CPF inválido');
    });

    test('cliente não encontrado retorna 404', async () => {
      supabase.from.mockImplementation((table) => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));

      const res = await request(app)
        .post('/transacao')
        .send({ cpf: '12345678901', valor: 100 });

      expect(res.status).toBe(404);
    });

    test('erro ao salvar retorna 500', async () => {
      supabase.from.mockImplementation((table) => {
        if (table === 'clientes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: { nome: 'João', plano: 'Mensal' },
              error: null,
            }),
          };
        }
        if (table === 'transacoes') {
          return {
            insert: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'db error' },
            }),
          };
        }
        return {};
      });

      const res = await request(app)
        .post('/transacao')
        .send({ cpf: '12345678901', valor: 100 });

      expect(res.status).toBe(500);
    });
  });
});
