const express = require('express');
const cors = require('cors');

const app = express();

// /health imune e primeiro
app.get('/health', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'dev';
  res.json({ ok: true, version: 'v0.1.0', sha });
});

app.use(express.json());
const allowed = process.env.ALLOWED_ORIGIN || '*';
app.use(
  cors({
    origin: allowed,
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-admin-pin'],
  })
);

// rotas da API (planos, etc)…
const planosRouter = require('./src/features/planos/planos.routes.js');
app.use('/planos', planosRouter);
app.use('/api/planos', planosRouter);

// ADMIN (ANTES do static)
const { requireAdminPin } = require('./middlewares/requireAdminPin');
const adminRoutes = require('./routes/admin.routes');
app.use('/admin', requireAdminPin, adminRoutes);

// /__routes opcional e protegido por PIN
function listRoutes(app) {
  const out = [];
  app._router?.stack?.forEach?.((l) => {
    if (l.route?.path) {
      const methods = Object.keys(l.route.methods || {}).map((m) => m.toUpperCase());
      out.push({ path: l.route.path, methods });
    } else if (l.name === 'router' && l.handle?.stack) {
      l.handle.stack.forEach((s) => {
        if (s.route?.path) {
          const methods = Object.keys(s.route.methods || {}).map((m) => m.toUpperCase());
          out.push({ path: s.route.path, methods });
        }
      });
    }
  });
  return out;
}
if (process.env.DIAG_ROUTES === '1') {
  app.get('/__routes', (req, res) => {
    try {
      if ((req.query.pin || '') !== (process.env.ADMIN_PIN || '')) {
        return res.status(401).json({ ok: false, error: 'invalid_pin' });
      }
      return res.json({ ok: true, count: listRoutes(app).length, routes: listRoutes(app) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message });
    }
  });
}

// static
app.use(require('express').static(require('path').join(__dirname, 'public')));

// 404
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.path}`));

// error handler (responde JSON em prod)
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
