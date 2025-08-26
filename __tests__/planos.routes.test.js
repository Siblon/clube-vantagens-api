const request = require('supertest');
const express = require('express');

jest.mock('../src/features/planos/planos.service.js', () => ({
  getAllPlanos: jest.fn(),
  getPlanoById: jest.fn(),
  createPlano: jest.fn(),
  updatePlano: jest.fn(),
  deletePlano: jest.fn(),
}));

const planosService = require('../src/features/planos/planos.service.js');
const planosRoutes = require('../src/features/planos/planos.routes.js');

const app = express();
app.use(express.json());
app.use(planosRoutes);

describe('Planos Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_PIN = '1234';
  });

  test('GET /planos - lista todos os planos', async () => {
    planosService.getAllPlanos.mockResolvedValue({ data: [{ id: 1 }], error: null });
    const res = await request(app).get('/planos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 1 }]);
  });

  test('POST /planos - cria plano', async () => {
    const payload = { nome: 'A', descricao: 'desc', preco: 10 };
    planosService.createPlano.mockResolvedValue({ data: { id: 1, ...payload }, error: null });
    const res = await request(app)
      .post('/planos')
      .set('x-admin-pin', '1234')
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...payload });
    expect(planosService.createPlano).toHaveBeenCalledWith(payload);
  });

  test('PUT /planos/:id - atualiza plano', async () => {
    const payload = { nome: 'B' };
    planosService.updatePlano.mockResolvedValue({ data: { id: '1', ...payload }, error: null });
    const res = await request(app)
      .put('/planos/1')
      .set('x-admin-pin', '1234')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '1', ...payload });
    expect(planosService.updatePlano).toHaveBeenCalledWith('1', payload);
  });

  test('DELETE /planos/:id - remove plano', async () => {
    planosService.deletePlano.mockResolvedValue({ data: null, error: null });
    const res = await request(app)
      .delete('/planos/1')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(204);
    expect(planosService.deletePlano).toHaveBeenCalledWith('1');
  });
});
