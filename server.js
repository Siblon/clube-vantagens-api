const express = require('express');
const app = express();
app.use(express.json());

// ===== Boot marker (diagnóstico) =====
const COMMIT_SHA =
  process.env.RAILWAY_GIT_COMMIT_SHA ||
  process.env.RAILWAY_GIT_COMMIT ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA || 'unknown';
console.log('BOOT MARKER R2:', { sha: COMMIT_SHA, node: process.version, env: process.env.NODE_ENV });

// Saúde
app.get('/health', (_req, res) => res.json({ ok: true, version: 'v0.1.0' }));

// ===== Montar rotas de planos ANTES de static/fallback =====
const planosRouter = require('./src/features/planos/planos.routes.js');
app.use('/planos', planosRouter);
app.use('/api/planos', planosRouter);
console.log('ROUTES MOUNTED R2: /planos, /api/planos');

// ===== Debug: listar rotas =====
app.get('/__routes', (_req, res) => {
  const list = [];
  const add = (route, base = '') => {
    const methods = Object.keys(route.methods || {}).map(m => m.toUpperCase());
    list.push({ path: base + route.path, methods });
  };
  const walk = (stack, base = '') => {
    (stack || []).forEach(layer => {
      if (layer.route) add(layer.route, base);
      else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        let prefix = '';
        try {
          const m = layer.regexp && layer.regexp.toString().match(/^\/\^\\\/(.*?)\\\//);
          if (m && m[1]) prefix = '/' + m[1];
        } catch {}
        walk(layer.handle.stack, base + prefix);
      }
    });
  };
  if (app && app._router) walk(app._router.stack);
  res.json({ ok: true, count: list.length, routes: list });
});

// (se houver) Static deve ficar DEPOIS das rotas
app.use(express.static('public'));

// Fallback 404
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.path}`));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));

module.exports = app;
