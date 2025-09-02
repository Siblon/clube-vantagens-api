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
  app.get('/', (req, res) => res.json({ ok:true, service:'clube-vantagens-api' }));
  app.head('/', (req, res) => res.sendStatus(200));

// rotas da API (planos, etc)…
const planosRouter = require('./src/features/planos/planos.routes.js');
app.use('/planos', planosRouter);
app.use('/api/planos', planosRouter);

// ADMIN (static pages + API)
const path = require('path');
const clientesRouter = require('./routes/admin.routes');
const clientesController = require('./controllers/clientesController');
const clientesRoutes = require('./src/features/clientes/clientes.routes.js');
const auditController = require('./controllers/auditController');
const adminsController = require('./controllers/adminsController');
const adminController = require('./controllers/adminController');
const adminReportController = require('./controllers/adminReportController');
const requireAdminPin = require('./middlewares/requireAdminPin');
const adminDiagRoutes = require('./routes/adminDiag');
const transacaoRoutes = require('./routes/transacao.routes') || require('./src/routes/transacao');

// páginas estáticas de /admin sem PIN
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// rotas de API de admin
app.get('/admin/clientes/export', requireAdminPin, clientesController.exportCsv);
app.use('/admin/clientes', clientesRouter);
app.use('/admin/clientes', requireAdminPin, clientesRoutes);
app.get('/admin/audit', requireAdminPin, auditController.list);
app.get('/admin/audit/export', requireAdminPin, auditController.exportAudit);
app.get('/admin/admins', requireAdminPin, adminsController.listAdmins);
app.post('/admin/admins', requireAdminPin, adminsController.createAdmin);
app.put('/admin/admins/:id/pin', requireAdminPin, adminsController.updateAdminPin);
app.delete('/admin/admins/:id', requireAdminPin, adminsController.deleteAdmin);
app.get('/admin/metrics', requireAdminPin, adminController.metrics);
app.get('/admin/report/summary', requireAdminPin, adminReportController.summary);
app.get('/admin/report/csv', requireAdminPin, adminReportController.csv);
app.get('/admin/whoami', requireAdminPin, adminController.whoami);
app.use('/admin', adminDiagRoutes);

const hasSupabase =
  !!process.env.SUPABASE_URL &&
  !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON);

if (hasSupabase) {
  const mpController = require('./controllers/mpController');
  app.post('/admin/mp/checkout', requireAdminPin, mpController.checkout);
  app.post('/webhooks/mp', mpController.webhook);
} else {
  console.log('[MP] Rotas de MP não montadas: variáveis do Supabase ausentes.');
}

// transações (protegidas por PIN)
app.use('/transacao', requireAdminPin, transacaoRoutes);


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
    app.get('/__routes', requireAdminPin, (req, res) => {
      try {
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

// Error handler padrão (deixe por último)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const msg = err.message || 'unexpected';
  if (status >= 500) {
    console.error('[ERROR]', { path: req.path, msg, stack: err.stack });
  }
  res.status(status).json({ ok:false, error: msg });
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
}

module.exports = app;
