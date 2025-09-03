const request = require('supertest');

const mockFrom = jest.fn();
jest.mock('../services/supabase', () => ({ from: mockFrom }));

jest.mock('../middlewares/requireAdminPin', () => (req, res, next) => {
  req.adminId = 1;
  req.adminNome = 'Admin';
  next();
});

const app = require('../server');

beforeEach(() => {
  mockFrom.mockReset();
});

describe('Admin transações endpoints', () => {
  test('GET /admin/transacoes aplica filtros e paginação', async () => {
    const q = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null, count: 1 }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .get('/admin/transacoes')
      .set('x-admin-pin', '1234')
      .query({
        cpf: '026.552.741-48',
        desde: '2024-01-01',
        ate: '2024-01-31',
        limit: '10',
        offset: '5',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, rows: [{ id: 1 }], total: 1 });
    expect(q.ilike).toHaveBeenCalledWith('cpf', '%02655274148%');
    expect(q.gte).toHaveBeenCalled();
    expect(q.lte).toHaveBeenCalled();
    expect(q.range).toHaveBeenCalledWith(5, 14);
  });

  test('GET /admin/transacoes/resumo retorna indicadores', async () => {
    const q = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: (resolve) =>
        resolve({
          data: [
            { valor_original: 100, valor_final: 80, status_pagamento: 'pago' },
            { valor_original: 200, valor_final: 200, status_pagamento: 'pendente' },
          ],
          count: 2,
          error: null,
        }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .get('/admin/transacoes/resumo')
      .set('x-admin-pin', '1234');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      total: 2,
      somaBruta: 300,
      somaFinal: 280,
      descontoTotal: 20,
      descontoMedioPercent: 6.67,
      ticketMedio: 140,
      porStatus: { pago: 1, pendente: 1 },
    });
  });

  test('GET /admin/transacoes/resumo com filtro status', async () => {
    const q = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      then: (resolve) =>
        resolve({
          data: [
            { valor_original: 100, valor_final: 80, status_pagamento: 'pago' },
          ],
          count: 1,
          error: null,
        }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .get('/admin/transacoes/resumo?status=pago')
      .set('x-admin-pin', '1234');

    expect(res.status).toBe(200);
    expect(q.eq).toHaveBeenCalledWith('status_pagamento', 'pago');
    expect(res.body.porStatus).toEqual({ pago: 1 });
  });

  test('GET /admin/transacoes/csv retorna CSV e aplica filtros', async () => {
    const q = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            id: 1,
            cpf: '123',
            valor_original: 100,
            valor_final: 90,
            desconto_aplicado: 10,
            metodo_pagamento: 'pix',
            status_pagamento: 'pago',
            created_at: '2024-01-01T00:00:00Z',
          },
        ],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .get('/admin/transacoes/csv')
      .set('x-admin-pin', '1234')
      .query({ cpf: '123', desde: '2024-01-01', ate: '2024-01-31' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('id,cpf');
    expect(q.ilike).toHaveBeenCalledWith('cpf', '%123%');
    expect(q.gte).toHaveBeenCalled();
    expect(q.lte).toHaveBeenCalled();
  });

  test('PATCH /admin/transacoes/:id atualiza status', async () => {
    const q = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 1, status_pagamento: 'pago' },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .patch('/admin/transacoes/1')
      .set('x-admin-pin', '1234')
      .send({
        status_pagamento: 'pago',
        metodo_pagamento: 'pix',
        observacoes: 'ok',
      });

    expect(res.status).toBe(200);
    const patch = q.update.mock.calls[0][0];
    expect(patch.status_pagamento).toBe('pago');
    expect(patch.metodo_pagamento).toBe('pix');
    expect(patch.observacoes).toBe('ok');
    expect(patch.last_admin_id).toBe('1');
    expect(typeof patch.paid_at).toBe('string');
    expect(patch.canceled_at).toBeNull();
  });

  test('PATCH /admin/transacoes/:id cancela transação', async () => {
    const q = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 1, status_pagamento: 'cancelado' },
        error: null,
      }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .patch('/admin/transacoes/1')
      .set('x-admin-pin', '1234')
      .send({ status_pagamento: 'cancelado' });

    expect(res.status).toBe(200);
    const patch = q.update.mock.calls[0][0];
    expect(patch.status_pagamento).toBe('cancelado');
    expect(patch.canceled_at).toBeTruthy();
    expect(patch.paid_at).toBeNull();
  });

  test('PATCH /admin/transacoes/:id valida status', async () => {
    const res = await request(app)
      .patch('/admin/transacoes/1')
      .set('x-admin-pin', '1234')
      .send({ status_pagamento: 'foo' });

    expect(res.status).toBe(400);
  });
});

