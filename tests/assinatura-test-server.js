const express = require('express');

(async () => {
  const routes = (await import('../src/features/assinaturas/assinatura.routes.js')).default;
  const repo = (await import('../src/features/assinaturas/assinatura.repo.js')).default;
  const clienteRepo = (await import('../src/features/clientes/cliente.repo.js')).default;

  const scenario = process.env.SCENARIO;
  if (scenario === 'missing') {
    clienteRepo.findByEmail = async () => null;
  } else {
    clienteRepo.findByEmail = async () => ({ id: 1 });
  }
  repo.create = async (a) => ({ id: 1, ...a });

  const { requireAdminPin } = await import('../src/middlewares/adminPin.js');

  const app = express();
  app.use(express.json());
  app.use('/admin/assinatura', requireAdminPin, routes);

  const port = process.env.PORT || 3456;
  app.listen(port, () => console.log('ready'));
})();
