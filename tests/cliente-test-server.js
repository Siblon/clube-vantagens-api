const express = require('express');
const routes = require('../src/features/clientes/cliente.routes.js');
const repo = require('../src/features/clientes/cliente.repo.js');
const { requireAdminPin } = require('../middlewares/requireAdminPin.js');

const scenario = process.env.SCENARIO;
if (scenario === 'duplicate') {
  repo.findByEmail = async () => ({ id: 1 });
  repo.create = async () => { throw new Error('should not'); };
} else {
  repo.findByEmail = async () => null;
  repo.create = async (c) => ({ id: 1, ...c });
}

const app = express();
app.use(express.json());
app.use('/admin/clientes', requireAdminPin, routes);

const port = process.env.PORT || 3456;
app.listen(port, () => console.log('ready'));
