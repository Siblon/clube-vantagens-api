const request = require('supertest');
const express = require('express');

process.env.SUPABASE_URL = 'https://example.com';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';

const mpController = require('../controllers/mpController');
const requireAdminPin = (req, _res, next) => { next(); };

const app = express();
app.post('/admin/mp/checkout', requireAdminPin, express.json(), mpController.checkout);
app.post('/webhooks/mp', express.json(), mpController.webhook);

describe('MP controller', () => {
  test('checkout requer cpf e valor', async () => {
    const res = await request(app)
      .post('/admin/mp/checkout')
      .set('x-admin-pin', '1234')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('webhook ignora tipos diferentes de payment', async () => {
    const res = await request(app)
      .post('/webhooks/mp')
      .send({ type: 'test', data: {} });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ignored', true);
  });
});
