const express = require('express');

const app = express();

// body parser primeiro
app.use(express.json());

// CORS dinâmico
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  if (ALLOWED_ORIGIN.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGIN.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// /health simples e sempre JSON
app.get('/health', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'dev';
  res.json({ ok: true, version: 'v0.1.0', sha });
});

  // raiz
  app.get('/', (req, res) => res.type('text/plain').send('ok'));
  app.head('/', (req, res) => res.sendStatus(200));

// rotas da API (planos, etc)…
const planosRouter = require('./src/features/planos/planos.routes.js');
app.use('/planos', planosRouter);
app.use('/api/planos', planosRouter);

// ADMIN (static pages + API)
const path = require('path');
const clientesRouter = require('./routes/admin.routes');

// páginas estáticas de /admin sem PIN
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// rotas de API de admin
app.use('/admin/clientes', clientesRouter);

// /__routes opcional e protegido por PIN
function listRoutesSafe(app) {
  const out = [];
  const stack = app && app._router && Array.isArray(app._router.stack) ? app._router.stack : [];
  for (const layer of stack) {
    if (layer && layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
      out.push({ path: layer.route.path, methods });
    }
    if (layer && layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
      for (const s of layer.handle.stack) {
        if (s && s.route && s.route.path) {
          const methods = Object.keys(s.route.methods || {}).map(m => m.toUpperCase());
          out.push({ path: s.route.path, methods });
        }
      }
    }
  }
  return out;
}
if (process.env.DIAG_ROUTES === '1') {
    app.get('/__routes', (req, res) => {
      try {
        const pin = String(req.query.pin || req.headers['x-admin-pin'] || '');
        if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
          return res.status(401).json({ ok: false, error: 'invalid_pin' });
        }
        const routes = listRoutesSafe(app);
        return res.json({ ok: true, count: routes.length, routes });
      } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    });
  }

// static
app.use(express.static(require('path').join(__dirname, 'public')));

  // 404
  app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.path}`));

  // error handler global
  app.use((err, req, res, next) => {
  const status = err.status || 500;
  const payload = { ok: false, error: err.message || 'internal_error' };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  try { return res.status(status).json(payload); }
  catch { return res.status(500).json({ ok: false, error: 'handler_failed' }); }
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
}

module.exports = app;
