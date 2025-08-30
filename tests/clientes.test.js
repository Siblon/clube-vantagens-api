const request = require('supertest');
const express = require('express');

jest.mock('../supabaseClient', () => ({
  supabase: { from: jest.fn() },
  assertSupabase: () => true,
}));

jest.mock('../utils/generateClientIds', () => jest.fn());

const { supabase, assertSupabase } = require('../supabaseClient');
const generateClientIds = require('../utils/generateClientIds');
const clientesController = require('../controllers/clientesController');

const app = express();
app.use(express.json());
app.get('/clientes', clientesController.list);
app.post('/clientes', clientesController.upsertOne);
app.post('/clientes/bulk', clientesController.bulkUpsert);
app.delete('/clientes/:cpf', clientesController.remove);
app.post('/clientes/generate-ids', clientesController.generateIds);

beforeEach(() => {
  supabase.from.mockReset();
  generateClientIds.mockReset();
});

describe('Clientes Controller', () => {
  test('list retorna dados com sucesso', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({
        range: jest
          .fn()
          .mockResolvedValue({ data: [{ cpf: '1' }], error: null, count: 1 }),
      }),
    });

    const res = await request(app).get('/clientes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rows: [{ cpf: '1' }], total: 1 });
  });

  test('list erro do banco retorna 500', async () => {
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnValue({
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'db' } }),
      }),
    });

    const res = await request(app).get('/clientes');
    expect(res.status).toBe(500);
  });

  test('upsertOne sucesso', async () => {
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({
          data: [{ cpf: '12345678901', nome: 'Fulano', metodo_pagamento: 'pix' }],
          error: null,
        }),
      }),
    });

    const res = await request(app)
      .post('/clientes')
      .send({
        cpf: '12345678901',
        nome: 'Fulano',
        plano: 'Mensal',
        status: 'ativo',
        metodo_pagamento: 'pix',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  test('upsertOne validação falha retorna 400', async () => {
    const res = await request(app)
      .post('/clientes')
      .send({
        cpf: '123',
        nome: '',
        plano: 'Mensal',
        status: 'ativo',
        metodo_pagamento: 'pix',
      });

    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('upsertOne erro do banco retorna 500', async () => {
    supabase.from.mockReturnValue({
      upsert: jest.fn().mockReturnValue({
        select: jest
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'db' } }),
      }),
    });

    const res = await request(app)
      .post('/clientes')
      .send({
        cpf: '12345678901',
        nome: 'Fulano',
        plano: 'Mensal',
        status: 'ativo',
        metodo_pagamento: 'pix',
      });

    expect(res.status).toBe(500);
  });

  test('bulkUpsert sucesso', async () => {
    let call = 0;
    supabase.from.mockImplementation(() => {
      if (call++ === 0) {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    const res = await request(app)
      .post('/clientes/bulk')
      .send({
        clientes: [
          {
            cpf: '12345678901',
            nome: 'Fulano',
            plano: 'Mensal',
            status: 'ativo',
            metodo_pagamento: 'pix',
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ inserted: 1, updated: 0, invalid: 0, duplicates: 0 });
  });

  test('bulkUpsert lista vazia retorna 400', async () => {
    const res = await request(app)
      .post('/clientes/bulk')
      .send({ clientes: [] });
    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('bulkUpsert erro do banco retorna 500', async () => {
    let call = 0;
    supabase.from.mockImplementation(() => {
      if (call++ === 0) {
        return {
          select: jest.fn().mockReturnThis(),
          in: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: 'db' } }),
        };
      }
      return {};
    });

    const res = await request(app)
      .post('/clientes/bulk')
      .send({
        clientes: [
          {
            cpf: '12345678901',
            nome: 'Fulano',
            plano: 'Mensal',
            status: 'ativo',
            metodo_pagamento: 'pix',
          },
        ],
      });

    expect(res.status).toBe(500);
  });

  test('remove sucesso', async () => {
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    });

    const res = await request(app).delete('/clientes/12345678901');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test('remove cpf inválido retorna 400', async () => {
    const res = await request(app).delete('/clientes/abc');
    expect(res.status).toBe(400);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  test('remove erro do banco retorna 500', async () => {
    supabase.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'db' } }),
    });

    const res = await request(app).delete('/clientes/12345678901');
    expect(res.status).toBe(500);
  });

  test('generateIds sucesso', async () => {
    generateClientIds.mockResolvedValue(5);
    const res = await request(app).post('/clientes/generate-ids');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ updated: 5 });
  });

  test('generateIds erro retorna 500', async () => {
    generateClientIds.mockRejectedValue(new Error('db'));
    const res = await request(app).post('/clientes/generate-ids');
    expect(res.status).toBe(500);
  });
});

