const express = require('express');
const path = require('path');
require('./config/env');

async function createApp() {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');

  const assinaturaController = require('./controllers/assinaturaController');
  const transacaoController = require('./controllers/transacaoController');
  const adminController = require('./controllers/adminController');
  const report = require('./controllers/reportController');
  const lead = require('./controllers/leadController');
  const clientes = require('./controllers/clientesController');
  const { requireAdminPin } = await import('./src/middlewares/adminPin.js');
  const clienteRoutes = (await import('./src/features/clientes/cliente.routes.js')).default;
  const assinaturaRoutes = (await import('./src/features/assinaturas/assinatura.routes.js')).default;
  const errorHandler = require('./src/middlewares/errorHandler.js');
  const metrics = require('./controllers/metricsController');
  const status = require('./controllers/statusController');

  const app = express();
  app.set('trust proxy', 1);

  const isTest = process.env.NODE_ENV === 'test';
  const hasMpEnv =
    process.env.MP_ACCESS_TOKEN &&
    process.env.MP_COLLECTOR_ID &&
    process.env.MP_WEBHOOK_SECRET;

  const enableMp = !isTest && hasMpEnv && !process.env.DISABLE_MP;

  let mpController = null;
  if (enableMp) {
    try {
      mpController = require('./controllers/mpController');
    } catch {}
  } else {
    console.log('Mercado Pago desabilitado (ambiente de teste ou env ausente)');
  }

  // --- Segurança ---
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // --- CORS com whitelist ---
  const whitelist = ['http://localhost:8888'];
  if (process.env.ALLOWED_ORIGIN) {
    whitelist.push(process.env.ALLOWED_ORIGIN);
  }

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || whitelist.includes(origin)) return cb(null, true);
        cb(new Error('CORS not allowed'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-pin'],
      credentials: false,
    })
  );

  // garante resposta ao preflight
  app.options('*', cors());

  const limiterTxn = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/public/lead', limiterTxn);

  // logging
  const morgan = require('morgan');
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public')));

  // Healthcheck
  app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v0.1.0' });
  });

  // status público simples
  app.get('/status/info', status.info);

  // status com PIN (usa requireAdminPin)
  app.get('/admin/status/ping-supabase', requireAdminPin, status.pingSupabase);

  // Rotas
  app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
  app.get('/assinaturas/listar', assinaturaController.listarTodas);
  app.use('/transacao', transacaoController);
  app.post('/admin/seed', requireAdminPin, adminController.seed);
  app.get('/admin/clientes', requireAdminPin, clientes.list);
  app.post('/admin/clientes/upsert', requireAdminPin, clientes.upsertOne);
  app.post('/admin/clientes/bulk-upsert', requireAdminPin, clientes.bulkUpsert);
  app.post('/admin/clientes/bulk', requireAdminPin, adminController.bulkClientes);
  app.delete('/admin/clientes/:cpf', requireAdminPin, clientes.remove);
  app.post('/admin/clientes/generate-ids', requireAdminPin, clientes.generateIds);
  app.use('/admin/clientes', requireAdminPin, clienteRoutes);
  app.use('/admin/assinatura', requireAdminPin, assinaturaRoutes);
  app.get('/admin/relatorios/resumo', requireAdminPin, report.resumo);
  app.get('/admin/relatorios/transacoes.csv', requireAdminPin, report.csv);
  app.get('/admin/metrics', requireAdminPin, metrics.resume);
  app.get('/admin/metrics/transacoes.csv', requireAdminPin, metrics.csv);
  // público (landing)
  app.post('/public/lead', express.json(), lead.publicCreate);

  // admin (PIN)
  app.get('/admin/leads', requireAdminPin, lead.adminList);
  app.get('/admin/leads.csv', requireAdminPin, lead.adminExportCsv);
  app.post('/admin/leads/approve', requireAdminPin, lead.adminApprove);
  app.post('/admin/leads/discard', requireAdminPin, lead.adminDiscard);

  // Mercado Pago
  if (mpController) {
    app.use('/mp', mpController);
  }

  // --- Erros ---
  app.use(errorHandler);

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  createApp()
    .then(app => {
      console.log('✅ Passou por todos os middlewares... pronto pra escutar');
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`API on http://localhost:${PORT}`);
        console.log('Supabase conectado →', process.env.SUPABASE_URL);
        console.log(
          'Env MP vars → ACCESS_TOKEN:',
          !!process.env.MP_ACCESS_TOKEN,
          'COLLECTOR_ID:',
          !!process.env.MP_COLLECTOR_ID,
          'WEBHOOK_SECRET:',
          !!process.env.MP_WEBHOOK_SECRET
        );
      });
    })
    .catch(err => {
      console.error('Failed to start server', err);
    });
}

module.exports = { createApp };
