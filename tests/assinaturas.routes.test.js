// tests/assinaturas.routes.test.js
const request = require('supertest');

// === Mocks dos repositórios usados pelo service =====================
// Usamos require.resolve para garantir que o mock acerte exatamente o
// mesmo módulo que o service importa (caminho absoluto resolvido).
const assinaturaRepoPath = require.resolve('../src/features/assinaturas/assinatura.repo.js');
const clientesRepoPath   = require.resolve('../src/features/clientes/cliente.repo.js');

// Mock do repo de assinaturas (apenas o que o service usa)
jest.mock(assinaturaRepoPath, () => ({
  create: jest.fn(),
}), { virtual: false });

// Mock do repo de clientes (apenas o que o service usa)
jest.mock(clientesRepoPath, () => ({
  findById:        jest.fn(),
  findByEmail:     jest.fn(),
  findByDocumento: jest.fn(),
}), { virtual: false });

// Agora podemos importar os módulos mockados para configurar comportamentos
const assinaturaRepo = require(assinaturaRepoPath);
const clientesRepo   = require(clientesRepoPath);

// Importa o app DEPOIS de definir os mocks
const { createApp } = require('../server');

let app;
let agent;
const ADMIN_PIN = process.env.ADMIN_PIN || '101881';

beforeAll(async () => {
  // createApp, em NODE_ENV=test, NÃO dá listen — perfeito para Supertest.
  app = await createApp();
  agent = request(app);
});

afterEach(() => {
  // limpa qualquer estado entre testes
  jest.clearAllMocks();
});

afterAll(async () => {
  // Não há server.listen aqui, então nada específico para fechar.
  jest.useRealTimers();
});

describe('POST /admin/assinatura', () => {
  test('cria assinatura com sucesso', async () => {
    // Arrange: cliente EXISTE
    clientesRepo.findByEmail.mockResolvedValue({ id: 1 });
    clientesRepo.findById.mockResolvedValue(null);
    clientesRepo.findByDocumento.mockResolvedValue(null);

    // O service calcula o valor via getPlanPrice; repo.create só precisa ecoar
    assinaturaRepo.create.mockImplementation(async (payload) => ({
      id: 1,
      cliente_id: payload.cliente_id,
      plano: payload.plano,
      valor: payload.valor, // virá 4990 pelo fallback ENV
    }));

    // Act
    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', ADMIN_PIN)
      .send({ email: 'a@a.com', plano: 'basico' });

    // Assert
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

    // repo.create foi chamado com valor calculado (centavos)
    expect(assinaturaRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente_id: 1,
        plano: 'basico',
        valor: 4990,
      })
    );
  });

  test('retorna 404 para cliente inexistente', async () => {
    // Arrange: cliente NÃO existe por nenhum identificador
    clientesRepo.findByEmail.mockResolvedValue(null);
    clientesRepo.findById.mockResolvedValue(null);
    clientesRepo.findByDocumento.mockResolvedValue(null);

    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', ADMIN_PIN)
      .send({ email: 'b@b.com', plano: 'basico' });

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  test('retorna 400 para dados inválidos', async () => {
    // Arrange: nem deveria consultar repositórios porque a validação falha antes
    clientesRepo.findByEmail.mockResolvedValue({ id: 1 });

    const res = await agent
      .post('/admin/assinatura')
      .set('x-admin-pin', ADMIN_PIN)
      .send({ email: 'invalid', plano: 'basico' }); // email inválido

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    // Garante que não chamou I/O quando payload é inválido
    expect(assinaturaRepo.create).not.toHaveBeenCalled();
  });
});
