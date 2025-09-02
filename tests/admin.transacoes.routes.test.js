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

describe('Admin transações extra endpoints', () => {
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

  test('PATCH /admin/transacoes/:id atualiza status', async () => {
    const q = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [{ id: 1, status_pagamento: 'pago' }],
        error: null,
      }),
    };
    mockFrom.mockReturnValue(q);

    const res = await request(app)
      .patch('/admin/transacoes/1')
      .set('x-admin-pin', '1234')
      .send({ status_pagamento: 'pago' });

    expect(res.status).toBe(200);
    expect(q.update).toHaveBeenCalled();
    const patch = q.update.mock.calls[0][0];
    expect(patch.status_pagamento).toBe('pago');
    expect(patch.last_admin_id).toBe('1');
  });

  test('PATCH /admin/transacoes/:id valida status', async () => {
    const res = await request(app)
      .patch('/admin/transacoes/1')
      .set('x-admin-pin', '1234')
      .send({ status_pagamento: 'foo' });

    expect(res.status).toBe(400);
  });
});
