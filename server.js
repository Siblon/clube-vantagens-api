const express = require('express');
const cors = require('cors');

const app = express();

// body parser primeiro
app.use(express.json());

// /health simples e sempre JSON
app.get('/health', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'dev';
  res.json({ ok: true, version: 'v0.1.0', sha });
});

// raiz não deve gerar 500
app.get('/', (req, res) => res.type('text/plain').send('ok'));
app.head('/', (req, res) => res.status(200).end());

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
function listRoutes(app){
  const items=[];
  const stack = app && app._router && Array.isArray(app._router.stack) ? app._router.stack : [];
  for(const layer of stack){
    if(layer && layer.route && layer.route.path){
      const methods = Object.keys(layer.route.methods||{}).map(m=>m.toUpperCase());
      items.push({ path: layer.route.path, methods });
    }
    if(layer && layer.name==='router' && layer.handle && Array.isArray(layer.handle.stack)){
      for(const s of layer.handle.stack){
        if(s && s.route && s.route.path){
          const methods = Object.keys(s.route.methods||{}).map(m=>m.toUpperCase());
          items.push({ path: s.route.path, methods });
        }
      }
    }
  }
  return items;
}
if(process.env.DIAG_ROUTES==='1'){
  app.get('/__routes',(req,res)=>{
    try{
      const adminPin = process.env.ADMIN_PIN || '';
      const pin = (req.query.pin || '').toString();
      if(!adminPin || pin!==adminPin){
        return res.status(401).json({ ok:false, error:'invalid_pin' });
      }
      const routes = listRoutes(app);
      return res.json({ ok:true, count: routes.length, routes });
    }catch(e){
      return res.status(500).json({ ok:false, error: e.message });
    }
  });
}

// static
app.use(express.static(require('path').join(__dirname, 'public')));

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
