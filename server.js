// server.js
// ================================
// Express API – pronto para testes (Supertest/Jest)
// - Em teste: use createApp() e NUNCA dá listen.
// - Em runtime normal: start automático (listen) se NODE_ENV !== 'test'.
// ================================

const express = require('express');
const path = require('path');
require('./config/env');

async function createApp() {
  const helmet = require('helmet');
  const rateLimit = require('express-rate-limit');
  const cors = require('cors');

  // Controllers
  const assinaturaController = require('./controllers/assinaturaController');
  const transacaoController = require('./controllers/transacaoController');
  const adminController = require('./controllers/adminController');
  const report = require('./controllers/reportController');
  const lead = require('./controllers/leadController');
  const clientes = require('./controllers/clientesController');
  const errorHandler = require('./middlewares/errorHandler');
  const metrics = require('./controllers/metricsController');
  const status = require('./controllers/statusController');

  // Rotas admin (ESM) via import dinâmico
  const adminRoutes = (await import('./src/routes/admin.js')).default;

  // Middleware admin PIN (ESM) via import dinâmico
  const { requireAdminPin } = await import('./src/middlewares/adminPin.js');

  // Ambiente
  const isTest = process.env.NODE_ENV === 'test';

  // Mercado Pago (opcional por envs) — DESABILITADO em testes
  const hasMpEnv =
    process.env.MP_ACCESS_TOKEN &&
    process.env.MP_COLLECTOR_ID &&
    process.env.MP_WEBHOOK_SECRET;

  // Permite forçar desabilitar com DISABLE_MP=true
  const enableMp = !isTest && hasMpEnv && !process.env.DISABLE_MP;

  let mpController = null;
  if (enableMp) {
    try {
      mpController = require('./controllers/mpController');
    } catch {
      // opcional: console.warn('MP controller ausente, usando stub.');
    }
  } else {
    console.log('Mercado Pago desabilitado (ambiente de teste ou env ausente)');
  }

  const app = express();
  app.set('trust proxy', 1);

  // --- Segurança ---
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // --- CORS dinâmico ---
  const allowedOrigins = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean); // ex: ["https://seu-site.netlify.app","http://localhost:8888"]

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl / same-origin
        if (allowedOrigins.length === 0) return cb(null, true); // sem whitelist definida
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error('CORS blocked'), false);
      },
    })
  );

  // Preflight
  app.options('*', cors());

  // Rate limit – leads (config simples; pode ser movido p/ env)
  const limiterLeads = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/public/lead', limiterLeads);

  // Body parser
  app.use(express.json({ limit: '1mb' }));

  // Arquivos estáticos
  app.use(express.static(path.join(__dirname, 'public')));

  // Healthcheck
  app.get('/health', (req, res) => {
    res.json({ ok: true, version: 'v0.1.0' });
  });

  // Status público simples
  app.get('/status/info', status.info);

  // Status com PIN (usa requireAdminPin)
  app.get('/admin/status/ping-supabase', requireAdminPin, status.pingSupabase);

  // ============ Rotas de negócio ============
  // Assinaturas
  app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
  app.get('/assinaturas/listar', assinaturaController.listarTodas);

  // Transações
  app.use('/transacao', transacaoController);

  // Admin (rotas unificadas)
  app.use('/admin', adminRoutes);
  app.post('/admin/seed', requireAdminPin, adminController.seed);

  // Clientes (admin)
  app.get('/admin/clientes', requireAdminPin, clientes.list);
  app.post('/admin/clientes/upsert', requireAdminPin, clientes.upsertOne);
  app.post('/admin/clientes/bulk-upsert', requireAdminPin, clientes.bulkUpsert);
  app.post('/admin/clientes/bulk', requireAdminPin, adminController.bulkClientes);
  app.delete('/admin/clientes/:cpf', requireAdminPin, clientes.remove);
  app.post('/admin/clientes/generate-ids', requireAdminPin, clientes.generateIds);

  // Relatórios/Métricas (admin)
  app.get('/admin/relatorios/resumo', requireAdminPin, report.resumo);
  app.get('/admin/relatorios/transacoes.csv', requireAdminPin, report.csv);
  app.get('/admin/metrics', requireAdminPin, metrics.resume);
  app.get('/admin/metrics/transacoes.csv', requireAdminPin, metrics.csv);

  // Leads
  app.post('/public/lead', lead.publicCreate); // express.json já aplicado globalmente
  app.get('/admin/leads', requireAdminPin, lead.adminList);
  app.get('/admin/leads.csv', requireAdminPin, lead.adminExportCsv);
  app.post('/admin/leads/approve', requireAdminPin, lead.adminApprove);
  app.post('/admin/leads/discard', requireAdminPin, lead.adminDiscard);

  // Mercado Pago (se habilitado)
  if (mpController) {
    app.use('/mp', mpController);
  }

  // --- Erros (sempre por último) ---
  app.use(errorHandler);

  return app;
}

// Execução automática somente fora de testes:
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      const app = await createApp();
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
    } catch (err) {
      console.error('Failed to start server', err);
      process.exit(1);
    }
  })();
}

// Export para testes: Supertest pode usar (await createApp())
module.exports = { createApp };
