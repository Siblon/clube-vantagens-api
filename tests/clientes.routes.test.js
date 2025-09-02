const request = require('supertest');
const { spawn } = require('child_process');

function startServer(scenario, port) {
  return new Promise((resolve) => {
    const proc = spawn('node', ['tests/cliente-test-server.js'], {
      env: {
        ...process.env,
        SCENARIO: scenario,
        ADMIN_PIN: '1234',
        PORT: port,
        SUPABASE_URL: 'http://localhost',
        SUPABASE_ANON: 'anon_key_123',
        SUPABASE_SERVICE_ROLE_KEY: 'service_key_123',
        DATABASE_URL: 'postgres://localhost/postgres',
        dotenv_config_path: '.env.test',
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

describe('POST /admin/clientes', () => {
  test('cria cliente com sucesso', async () => {
    const port = getPort();
    const server = await startServer('success', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/clientes')
      .set('x-admin-pin', '1234')
      .send({ nome: 'Fulano', email: 'a@a.com', telefone: '(11)99999-8888' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ok: true,
      data: {
        id: 1,
        nome: 'Fulano',
        email: 'a@a.com',
        telefone: '11999998888',
      },
      meta: { version: 'v0.1.0' },
    });
    stopServer(server);
  });

  test('retorna 400 para dados inválidos', async () => {
    const port = getPort();
    const server = await startServer('success', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/clientes')
      .set('x-admin-pin', '1234')
      .send({ nome: '', email: 'invalid', telefone: '' });
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    stopServer(server);
  });

  test('retorna 409 para email duplicado', async () => {
    const port = getPort();
    const server = await startServer('duplicate', port);
    const agent = request(`http://localhost:${port}`);
    const res = await agent
      .post('/admin/clientes')
      .set('x-admin-pin', '1234')
      .send({ nome: 'Fulano', email: 'a@a.com', telefone: '11999998888' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      ok: false,
      error: 'Email já cadastrado',
      code: 'DUPLICATE_EMAIL',
    });
    stopServer(server);
  });
});
