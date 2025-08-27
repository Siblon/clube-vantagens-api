const express = require('express');

let planosRouter;
try {
  const mod = require('./src/features/planos/planos.routes.js');
  planosRouter = mod.router ? mod.router : mod;
} catch (err) {
  console.error('Failed to import planos router', err);
  planosRouter = express.Router();
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true, version: 'v0.1.0' }));

  // ROTAS DA API – montadas ANTES de estáticos
  app.use('/planos', planosRouter);
  app.use('/api/planos', planosRouter);

  app.get('/__routes', (req, res) => {
    const list = [];
    app._router?.stack?.forEach(l => {
      if (l.route?.path) {
        const methods = Object.keys(l.route.methods || {}).join(',');
        list.push({ path: l.route.path, methods });
      } else if (l.name === 'router' && l.handle?.stack) {
        l.handle.stack.forEach(s => {
          if (s.route?.path) {
            const methods = Object.keys(s.route.methods || {}).join(',');
            list.push({ path: s.route.path, methods });
          }
        });
      }
    });
    res.json({ ok: true, routes: list });
  });

  console.log('ROUTES MOUNTED: /planos and /api/planos; debug at /__routes');

  app.use(express.static('public'));
  // app.get('*', …);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

module.exports = { createApp };
