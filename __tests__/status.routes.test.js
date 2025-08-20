const request = require('supertest');
const { createApp } = require('../server');

let app;
beforeAll(async () => {
  app = await createApp();
});

test('GET /status -> 200/204', async () => {
  const res = await request(app).get('/status');
  expect([200, 204]).toContain(res.status);
});
