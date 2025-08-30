const express = require('express');
const routes = require('../src/features/assinaturas/assinatura.routes.js');
const repo = require('../src/features/assinaturas/assinatura.repo.js');
const clienteRepo = require('../src/features/clientes/cliente.repo.js');
const { requireAdminPin } = require('../middlewares/requireAdminPin.js');

const scenario = process.env.SCENARIO;
if (scenario === 'missing') {
  clienteRepo.findByEmail = async () => null;
} else {
  clienteRepo.findByEmail = async () => ({ id: 1 });
}
repo.create = async (a) => ({ id: 1, ...a });

const app = express();
app.use(express.json());
app.use('/admin/assinatura', requireAdminPin, routes);

const port = process.env.PORT || 3456;
app.listen(port, () => console.log('ready'));
