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

function createApp() {
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
  const defaultOrigins = ['http://localhost:5173', /\.netlify\.app$/];
  const allowed = process.env.ALLOWED_ORIGIN?.split(',').filter(Boolean) || defaultOrigins;
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        const ok = allowed.some((o) => (o instanceof RegExp ? o.test(origin) : o === origin));
        return cb(ok ? null : new Error('Not allowed by CORS'), ok);
      },
    }),
  );
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
    const out = [];
    const stack = (app._router && app._router.stack) || [];
    for (const layer of stack) {
      if (layer.route?.path) {
        out.push({ path: layer.route.path, methods: Object.keys(layer.route.methods || {}) });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        for (const s of layer.handle.stack) {
          if (s.route?.path) out.push({ path: '/(mounted)/' + s.route.path, methods: Object.keys(s.route.methods || {}) });
        }
      }
    }
    res.json({ ok: true, routes: out });
  });

  // Error handler SEMPRE por último
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

