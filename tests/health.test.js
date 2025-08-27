process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../server');

test('GET /health → 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('ok', true);
});
