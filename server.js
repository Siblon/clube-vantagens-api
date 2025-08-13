const express = require('express');
const path = require('path');
require('./config/env');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const assinaturaController = require('./controllers/assinaturaController');
const transacaoController = require('./controllers/transacaoController');
const adminController = require('./controllers/adminController');
const report = require('./controllers/reportController');
const lead = require('./controllers/leadController');
const clientes = require('./controllers/clientesController');
const { requireAdmin } = require('./middlewares/requireAdmin');
const errorHandler = require('./middlewares/errorHandler');
const adminRoutes = require('./src/routes/admin');
const hasMpEnv = process.env.MP_ACCESS_TOKEN && process.env.MP_COLLECTOR_ID && process.env.MP_WEBHOOK_SECRET;
let mpController = null;
if (hasMpEnv) {
  try {
    mpController = require('./controllers/mpController');
  } catch (_) {
    // opcional: console.log('MP controller ausente, usando stub.');
  }
} else {
  console.log('Mercado Pago desabilitado: variáveis de ambiente ausentes');
}
const metrics = require('./controllers/metricsController');
const status = require('./controllers/statusController');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// --- Segurança ---
app.use(helmet({ crossOriginResourcePolicy: false }));

// --- CORS dinâmico ---
const allowed = process.env.ALLOWED_ORIGIN; // ex: "https://seu-site.netlify.app,http://localhost:8888"
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowed && allowed.split(',').some(o => origin.startsWith(o.trim()))) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  }
}));

// garante resposta ao preflight
app.options('*', cors());

const limiterTxn = rateLimit({ windowMs: 5*60*1000, limit: 60, standardHeaders: true, legacyHeaders: false });
app.use('/public/lead', limiterTxn);

// (morgan opcional em dev)
// const morgan = require('morgan');
// if(process.env.NODE_ENV !== 'production'){ app.use(morgan('dev')); }

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, version: 'v0.1.0' });
});

// status público simples
app.get('/status/info', status.info);

// status com PIN (usa requireAdmin)
app.get('/admin/status/ping-supabase', requireAdmin, status.pingSupabase);

// Rotas
app.get('/assinaturas', assinaturaController.consultarPorIdentificador);
app.get('/assinaturas/listar', assinaturaController.listarTodas);
app.use('/transacao', transacaoController);
app.use('/admin', adminRoutes);
app.post('/admin/seed', requireAdmin, adminController.seed);
app.get('/admin/clientes', requireAdmin, clientes.list);
app.post('/admin/clientes/upsert', requireAdmin, clientes.upsertOne);
app.post('/admin/clientes/bulk-upsert', requireAdmin, clientes.bulkUpsert);
app.post('/admin/clientes/bulk', requireAdmin, adminController.bulkClientes);
app.delete('/admin/clientes/:cpf', requireAdmin, clientes.remove);
app.post('/admin/clientes/generate-ids', requireAdmin, clientes.generateIds);
app.get('/admin/relatorios/resumo', requireAdmin, report.resumo);
app.get('/admin/relatorios/transacoes.csv', requireAdmin, report.csv);
app.get('/admin/metrics', requireAdmin, metrics.resume);
app.get('/admin/metrics/transacoes.csv', requireAdmin, metrics.csv);
// público (landing)
app.post('/public/lead', express.json(), lead.publicCreate);

// admin (PIN)
app.get('/admin/leads', requireAdmin, lead.adminList);
app.get('/admin/leads.csv', requireAdmin, lead.adminExportCsv);
app.post('/admin/leads/approve', requireAdmin, lead.adminApprove);
app.post('/admin/leads/discard', requireAdmin, lead.adminDiscard);

// Mercado Pago
if (mpController) {
  app.use('/mp', mpController);
}

// --- Erros ---
app.use(errorHandler);

console.log('✅ Passou por todos os middlewares... pronto pra escutar');

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log('Supabase conectado →', process.env.SUPABASE_URL);
  console.log(
    'Env MP vars → ACCESS_TOKEN:', !!process.env.MP_ACCESS_TOKEN,
    'COLLECTOR_ID:', !!process.env.MP_COLLECTOR_ID,
    'WEBHOOK_SECRET:', !!process.env.MP_WEBHOOK_SECRET
  );
});
