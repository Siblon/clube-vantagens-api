const express = require('express');

(async () => {
  const routes = (await import('../src/features/clientes/cliente.routes.js')).default;
  const repo = await import('../src/features/clientes/cliente.repo.js');

  const scenario = process.env.SCENARIO;
  if (scenario === 'duplicate') {
    repo.findByEmail = async () => ({ id: 1 });
    repo.create = async () => { throw new Error('should not'); };
  } else {
    // default success behaviour
    repo.findByEmail = async () => null;
    repo.create = async (c) => ({ id: 1, ...c });
  }

  const { requireAdminPin } = await import('../src/middlewares/adminPin.js');

  const app = express();
  app.use(express.json());
  app.use('/admin/clientes', requireAdminPin, routes);

  const port = process.env.PORT || 3456;
  app.listen(port, () => console.log('ready'));
})();
