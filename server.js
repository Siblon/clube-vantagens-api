// server.js
// ================================
// Express API – pronto para testes (Supertest/Jest)
// - Em teste: use createApp() e NUNCA dá listen.
// - Em runtime normal: start automático (listen) se NODE_ENV !== 'test'.
// ================================

const express = require('express');
require('./config/env');

async function createApp() {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');

  // Controllers (CommonJS)
  const assinaturaController = require('./controllers/assinaturaController');
  const transacaoController = require('./controllers/transacaoController');
  const adminController = require('./controllers/adminController');
  const report = require('./controllers/reportController');
  const lead = require('./controllers/leadController');
  const clientes = require('./controllers/clientesController');
  const metrics = require('./controllers/metricsController');
  const status = require('./controllers/statusController');

  // Admin (CommonJS)
  const adminRoutes = require('./src/routes/admin');
  const { requireAdminPin } = require('./src/middlewares/adminPin');
  const assinaturaFeatureRoutes = require('./src/features/assinaturas/assinatura.routes');

  // Error handler
  const errorHandler = require('./middlewares/errorHandler');

  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') || true }));
  app.use(rateLimit({ windowMs: 60_000, max: 100 }));
  app.use(express.json());

  // Rotas públicas
  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
  app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
  app.get('/assinaturas/listar', assinaturaController.listarTodas);
  // ⚠️ monte AQUI, SEM prefixo, e ANTES de adminRoutes
  app.use(assinaturaFeatureRoutes);
  // Transações
  app.use('/transacao', transacaoController);
  app.use('/public', lead);
  app.use('/status', status);
  app.use('/metrics', metrics);

  // Admin (vem depois para não sobrepor /admin/assinatura)
  app.use('/admin', requireAdminPin, adminRoutes);
  app.use('/admin', requireAdminPin, adminController);
  app.use('/admin/clientes', requireAdminPin, clientes);
  app.use('/admin/report', requireAdminPin, report);

  // Error handler SEMPRE por último
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

// Sobe servidor só fora de teste
if (process.env.NODE_ENV !== 'test') {
  createApp().then(app => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API rodando na porta ${port}`);
    });
  });
}

