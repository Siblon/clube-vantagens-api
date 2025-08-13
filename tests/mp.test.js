const request = require('supertest');
const express = require('express');

jest.mock('../supabaseClient', () => ({
  from: jest.fn(),
  assertSupabase: () => true,
}));

const mockGet = jest.fn();
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  User: jest.fn().mockImplementation(() => ({ get: mockGet })),
}));

const mpController = require('../controllers/mpController');
const app = express();
app.use('/mp', mpController);
const errorHandler = require('../middlewares/errorHandler');
app.use(errorHandler);

describe('MP status', () => {
  beforeEach(() => {
    mockGet.mockReset();
    delete process.env.MP_ACCESS_TOKEN;
    delete process.env.MP_COLLECTOR_ID;
  });

  test('retorna 503 sem variáveis de ambiente', async () => {
    const res = await request(app).get('/mp/status');
    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty('error', 'missing_env');
    expect(mockGet).not.toHaveBeenCalled();
  });

  test('retorna status quando variáveis presentes', async () => {
    process.env.MP_ACCESS_TOKEN = 'token';
    process.env.MP_COLLECTOR_ID = '123';
    mockGet.mockResolvedValue({ id: 456, live_mode: true });

    const res = await request(app).get('/mp/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collector_id', 456);
    expect(res.body).toHaveProperty('live', true);
  });
});
