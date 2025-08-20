const request = require('supertest');
const { createApp } = require('../server');

let app;
beforeAll(async () => {
  app = await createApp();
});

test('GET /health -> 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('ok', true);
});
