const express = require('express');
const planosRouter = require('./src/features/planos/planos.routes.js');

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true, version: 'v0.1.0' }));

  // ROTAS DA API – montadas ANTES de estáticos
  app.use('/planos', planosRouter);
  app.use('/api/planos', planosRouter); // compatível com proxy
  console.log('[[BOOT]] routes mounted: /planos, /api/planos');

  // rota de debug das rotas
  app.get('/__routes', (req, res) => {
    const list = [];
    const stack = (app._router && app._router.stack) || [];
    for (const layer of stack) {
      if (layer.route?.path) {
        list.push({ path: layer.route.path, methods: Object.keys(layer.route.methods || {}) });
      } else if (layer.name === 'router' && layer.handle?.stack) {
        for (const s of layer.handle.stack) {
          if (s.route?.path) {
            list.push({ path: '(mounted)/' + s.route.path, methods: Object.keys(s.route.methods || {}) });
          }
        }
      }
    }
    res.json({ ok: true, routes: list });
  });

  // …aqui embaixo vêm os estáticos e catch-all…
  // app.use(express.static('public'));
  // app.get('*', …);

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

module.exports = { createApp };
