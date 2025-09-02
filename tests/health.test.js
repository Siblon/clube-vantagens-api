process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'http://localhost';
process.env.SUPABASE_ANON = 'anon-key-123';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-123';
const request = require('supertest');
const app = require('../server');

test('GET /health → 200', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('ok', true);
});
