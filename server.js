const express = require('express');
const path = require('path');
const fs = require('fs');

function pickRouter(mod) {
  if (!mod) return null;
  if (mod.router) return mod.router;
  if (mod.default) return mod.default;
  return mod; // pode já ser o router
}

function safeRequireRouter(absPath) {
  try {
    console.log('[BOOT] tentando carregar router em', absPath);
    if (!fs.existsSync(absPath)) {
      console.error('[BOOT] ARQUIVO NAO ENCONTRADO:', absPath);
      return null;
    }
    const mod = require(absPath);
    const r = pickRouter(mod);
    const keys = mod ? Object.keys(mod) : [];
    if (r && (typeof r === 'function' || r.stack)) {
      console.log('[BOOT] router OK. export keys =', keys);
      return r;
    }
    console.error('[BOOT] export invalido. export keys =', keys);
    return null;
  } catch (e) {
    console.error('[BOOT] ERRO no require do router:', e && e.message);
    return null;
  }
}

function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true, version: 'v0.1.0' }));

  const planosPath = path.join(__dirname, 'src', 'features', 'planos', 'planos.routes.js');
  const planosRouter = safeRequireRouter(planosPath);
  if (planosRouter) {
    app.use('/planos', planosRouter);
    app.use('/api/planos', planosRouter);
    console.log('[BOOT] MONTADO: /planos e /api/planos');
  } else {
    console.error('[BOOT] NAO MONTADO: router de planos');
  }

  app.get('/__routes', (req, res) => {
    const list = [];
    const add = (route, base = '') => {
      const methods = Object.keys(route.methods || {}).join(',');
      list.push({ path: base + route.path, methods });
    };
    const walk = (stack, base = '') => {
      (stack || []).forEach(l => {
        if (l.route) add(l.route, base);
        else if (l.name === 'router' && l.handle && l.handle.stack) {
          let prefix = '';
          try {
            const m = l.regexp && l.regexp.toString().match(/^\/\^\\\/(.*?)\\\//);
            if (m && m[1]) prefix = '/' + m[1];
          } catch {}
          walk(l.handle.stack, base + prefix);
        }
      });
    };
    if (app && app._router) walk(app._router.stack);
    res.json({ ok: true, routes: list });
  });

  app.use(express.static('public'));

  return app;
}

if (require.main === module) {
  const app = createApp();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`API listening on :${port}`));
}

module.exports = { createApp };
