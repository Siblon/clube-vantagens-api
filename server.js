// server.js
const express = require('express');
const { requireAdminPin } = require('./middlewares/requireAdminPin');
const adminRoutes = require('./routes/admin.routes');
const cors = require('cors');

const app = express();
app.use(express.json());
const allowed = process.env.ALLOWED_ORIGIN || '*';
app.use(
  cors({
    origin: allowed,
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-admin-pin'],
  })
);

// ===== Boot marker (diagnóstico de boot) =====
const COMMIT_SHA =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  'unknown';

console.log('BOOT MARKER', {
  sha: COMMIT_SHA,
  node: process.version,
  env: process.env.NODE_ENV,
});

// ===== /health (inclui SHA para validar deploy) =====
app.get('/health', (_req, res) => {
  res.json({ ok: true, version: 'v0.1.0', sha: COMMIT_SHA });
});

// ===== Rotas de planos (montadas ANTES de static/fallback) =====
const planosRouter = require('./src/features/planos/planos.routes.js');
app.use('/planos', planosRouter);
app.use('/api/planos', planosRouter);

// ===== Rotas ADMIN (com PIN) =====
app.use('/admin', requireAdminPin, adminRoutes);

// ===== (/__routes) debug opcional e protegido =====
// Ative com DIAG_ROUTES=1. Opcionalmente defina ADMIN_PIN para exigir ?pin=...
function requirePin(req, res, next) {
  const pin = process.env.ADMIN_PIN;
  if (!pin) return next();                 // sem PIN configurado -> segue
  if (req.query.pin === pin) return next();
  return res.status(401).json({ ok: false, error: 'unauthorized' });
}

function collectRoutes(appInstance) {
  const list = [];
  const add = (route, base = '') => {
    const methods = Object.keys(route.methods || {})
      .filter(Boolean)
      .map((m) => m.toUpperCase());
    list.push({ path: base + route.path, methods });
  };
  const walk = (stack, base = '') => {
    (stack || []).forEach((layer) => {
      if (layer?.route) {
        add(layer.route, base);
      } else if (layer?.name === 'router' && layer?.handle?.stack) {
        let prefix = '';
        try {
          // tenta extrair o prefixo do router (Express gera uma RegExp)
          const m = layer.regexp?.toString().match(/^\/\^\\\/(.*?)\\\//);
          if (m?.[1]) prefix = '/' + m[1];
        } catch {}
        walk(layer.handle.stack, base + prefix);
      }
    });
  };
  if (appInstance?._router) {
    walk(appInstance._router.stack);
  }
  return list;
}

if (process.env.DIAG_ROUTES === '1') {
  app.get('/__routes', requirePin, (_req, res) => {
    const routes = collectRoutes(app);
    res.json({ ok: true, count: routes.length, routes });
  });
}

  // ===== Static (DEPOIS das rotas da API) =====
  app.use(
    require('path').join
      ? express.static(require('path').join(__dirname, 'public'))
      : (req, res, next) => next()
  );

// ===== Fallback 404 =====
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.path}`));

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
}

module.exports = app;
