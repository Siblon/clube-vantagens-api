// server.js
// ================================
// Express API – pronto para testes (Supertest/Jest)
// - Em teste: use createApp() e NUNCA dá listen.
// - Em runtime normal: start automático (listen) se NODE_ENV !== 'test'.
// ================================

const express = require('express');
require('./config/env');

function asRouter(mod) {
  const candidate = (mod && (mod.router || mod.default?.router || mod.default)) || mod;
  if (candidate && typeof candidate === 'function') return candidate; // já é middleware
  if (candidate && typeof candidate.use === 'function') return candidate; // já é Router/app
  const express = require('express');
  const r = express.Router();
  if (candidate && typeof candidate === 'object') {
    if (typeof candidate.handler === 'function') r.use(candidate.handler);
    else if (typeof candidate.index === 'function') r.use(candidate.index);
    else r.use((req, res, next) => next()); // no-op para não quebrar
  }
  return r;
}

async function createApp() {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');

  // Controllers (CommonJS)
  const assinaturaController = require('./controllers/assinaturaController');

  // Routers (CommonJS)
  const lead = asRouter(require('./src/routes/lead'));
  const status = asRouter(require('./src/routes/status'));
  const metrics = asRouter(require('./src/routes/metrics'));
  const transacaoController = asRouter(require('./src/routes/transacao'));

  // Admin (CommonJS)
  const adminRoutes = asRouter(require('./src/routes/admin-routes'));
  const adminController = asRouter(require('./src/routes/admin'));
  const clientes = asRouter(require('./src/routes/clientes'));
  const report = asRouter(require('./src/routes/report'));
  const { requireAdminPin } = require('./src/middlewares/adminPin');

  // Features (CommonJS)
  const assinaturaFeatureRoutes = asRouter(require('./src/features/assinaturas/assinaturas.routes.js'));
  const planosRouter = require('./src/features/planos/planos.routes.js');

  // Error handler
  const errorHandler = require('./middlewares/errorHandler');

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json());
  app.use(helmet());
  app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') || true }));
  app.use(rateLimit({ windowMs: 60_000, max: 100 }));

  // Rotas públicas
  app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

  // GETs públicos
  app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
  app.get('/assinaturas/listar', assinaturaController.listarTodas);

  // ✅ features SEM prefixo (ordem importa!)
  app.use(assinaturaFeatureRoutes);
  app.use('/planos', planosRouter);
  console.log('[routes] mounted /planos');

  // demais módulos
  app.use('/public', lead);
  app.use('/status', status);
  app.use('/metrics', metrics);
  app.use('/transacao', transacaoController);

  // ✅ admin legacy DEPOIS das features
  app.use('/admin', requireAdminPin, adminRoutes);
  app.use('/admin', requireAdminPin, adminController);
  app.use('/admin/clientes', requireAdminPin, clientes);
  app.use('/admin/report', requireAdminPin, report);

  app.get('/__routes', (req, res) => {
    const list = [];
    const stack = (app._router && app._router.stack) || [];
    for (const layer of stack) {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {});
        list.push({ base: '', path: layer.route.path, methods });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const base = layer.regexp && layer.regexp.fast_star ? '*' : '';
        for (const s of layer.handle.stack) {
          if (s.route && s.route.path) {
            const methods = Object.keys(s.route.methods || {});
            list.push({ base, path: s.route.path, methods });
          }
        }
      }
    }
    res.json({ ok: true, routes: list });
  });

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

