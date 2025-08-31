const request = require('supertest');
const express = require('express');

jest.mock('../src/features/planos/planos.service.js', () => ({
  getAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('../middlewares/requireAdminPin.js', () => (req, res, next) => {
  const pin = req.header('x-admin-pin');
  if (pin === '1234') { req.adminId = 1; return next(); }
  return res.status(401).json({ ok:false, error:'invalid_pin' });
});

const planosService = require('../src/features/planos/planos.service.js');
const planosRoutes = require('../src/features/planos/planos.routes.js');

const app = express();
app.use(express.json());
app.use('/planos', planosRoutes);

describe('Planos Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /planos - lista todos os planos', async () => {
    planosService.getAll.mockResolvedValue({ data: [{ id: 1 }], error: null });
    const res = await request(app).get('/planos');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, source: 'planos.routes' });
  });

  test('POST /planos - cria plano', async () => {
    const payload = { nome: 'A', descricao: 'desc', preco: 10 };
    planosService.create.mockResolvedValue({ data: { id: 1, ...payload }, error: null });
    const res = await request(app)
      .post('/planos')
      .set('x-admin-pin', '1234')
      .send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, ...payload });
    expect(planosService.create).toHaveBeenCalledWith(payload);
  });

  test('POST /planos sem PIN retorna 401', async () => {
    const payload = { nome: 'A' };
    const res = await request(app).post('/planos').send(payload);
    expect(res.status).toBe(401);
    expect(planosService.create).not.toHaveBeenCalled();
  });

  test('POST /planos com PIN inválido retorna 401', async () => {
    const payload = { nome: 'A' };
    const res = await request(app)
      .post('/planos')
      .set('x-admin-pin', '0000')
      .send(payload);
    expect(res.status).toBe(401);
    expect(planosService.create).not.toHaveBeenCalled();
  });

  test('PUT /planos/:id - atualiza plano', async () => {
    const payload = { nome: 'B' };
    planosService.update.mockResolvedValue({ data: { id: '1', ...payload }, error: null });
    const res = await request(app)
      .put('/planos/1')
      .set('x-admin-pin', '1234')
      .send(payload);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: '1', ...payload });
    expect(planosService.update).toHaveBeenCalledWith('1', payload);
  });

  test('DELETE /planos/:id - remove plano', async () => {
    planosService.remove.mockResolvedValue({ data: null, error: null });
    const res = await request(app)
      .delete('/planos/1')
      .set('x-admin-pin', '1234');
    expect(res.status).toBe(204);
    expect(planosService.remove).toHaveBeenCalledWith('1');
  });
});
