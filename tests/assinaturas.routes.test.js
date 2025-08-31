const request = require('supertest');
const { spawn } = require('child_process');

function startServer(scenario, port) {
  return new Promise((resolve) => {
    const proc = spawn('node', ['tests/assinatura-test-server.js'], {
      env: {
        ...process.env,
        SCENARIO: scenario,
        ADMIN_PIN: '1234',
        PORT: port,
        SUPABASE_URL: 'http://localhost',
        SUPABASE_ANON_KEY: 'anon',
      },
    });
    proc.stdout.on('data', (d) => {
      if (d.toString().includes('ready')) resolve(proc);
    });
  });
}

function stopServer(proc) {
  proc.kill();
}

function getPort() {
  return 4000 + Math.floor(Math.random() * 500);
}

describe('POST /admin/assinatura', () => {
  test('cria assinatura com sucesso', async () => {
    const port = getPort();
    const server = await startServer('success', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', '1234')
      .send({ email: 'a@a.com', plano: 'basico' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      data: {
        id: 1,
        cliente_id: 1,
        plano: 'basico',
        valor: 4990,
        valorBRL: 49.9,
      },
      meta: { version: 'v0.1.0' },
    });
    stopServer(server);
  });

  test('retorna 404 para cliente inexistente', async () => {
    const port = getPort();
    const server = await startServer('missing', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', '1234')
      .send({ email: 'b@b.com', plano: 'basico' });
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    stopServer(server);
  });

  test('retorna 400 para dados inválidos', async () => {
    const port = getPort();
    const server = await startServer('success', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', '1234')
      .send({ email: 'invalid', plano: 'basico' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    stopServer(server);
  });
});
