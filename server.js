// server.js
// ================================
// Express API – pronto para testes (Supertest/Jest)
// - Em teste: use createApp() e NUNCA dá listen.
// - Em runtime normal: start automático (listen) se NODE_ENV !== 'test'.
// ================================

const express = require('express');
require('./config/env');

function asRouter(mod) {
  return (mod && (mod.router || mod.default?.router || mod.default)) || mod;
}

async function createApp() {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');

  // Controllers (CommonJS)
  const assinaturaController = require('./controllers/assinaturaController');
  const adminController = require('./controllers/adminController');
  const report = require('./controllers/reportController');
  const clientes = require('./controllers/clientesController');

  // Routers (CommonJS)
  const lead = asRouter(require('./src/routes/lead'));
  const status = asRouter(require('./src/routes/status'));
  const metrics = asRouter(require('./src/routes/metrics'));
  const transacaoController = asRouter(require('./src/routes/transacao'));

  // Admin (CommonJS)
  const adminRoutes = require('./src/routes/admin');
  const { requireAdminPin } = require('./src/middlewares/adminPin');

  // Features (CommonJS)
  const assinaturaFeatureRoutes = asRouter(require('./src/features/assinaturas/assinatura.routes'));
  const planosFeatureRoutes = asRouter(require('./src/features/planos/planos.routes')); // ✅

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

  // GETs públicos
  app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
  app.get('/assinaturas/listar', assinaturaController.listarTodas);

  // ✅ features SEM prefixo (ordem importa!)
  app.use(assinaturaFeatureRoutes);
  app.use(planosFeatureRoutes);

  // demais módulos
  app.use('/transacao', transacaoController);
  app.use('/public', lead);
  app.use('/status', status);
  app.use('/metrics', metrics);

  // ✅ admin legacy DEPOIS das features
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

