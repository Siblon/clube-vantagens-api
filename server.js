const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const assinaturaController = require('./controllers/assinaturaController');
const transacaoController = require('./controllers/transacaoController');
const adminController = require('./controllers/adminController');
const report = require('./controllers/reportController');
const lead = require('./controllers/leadController');
const clientes = require('./controllers/clientesController');
const { requireAdmin } = require('./middlewares/requireAdmin');
const mp = require('./controllers/mpController');
const metrics = require('./controllers/metricsController');
const status = require('./controllers/statusController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
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
// simula a transação sem registrar
app.get('/transacao/preview', transacaoController.preview);
app.post('/transacao', transacaoController.registrar);
app.post('/admin/seed', requireAdmin, adminController.seed);
app.get('/admin/clientes', requireAdmin, clientes.list);
app.post('/admin/clientes/upsert', requireAdmin, clientes.upsertOne);
app.post('/admin/clientes/bulk-upsert', requireAdmin, clientes.bulkUpsert);
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
app.get('/mp/status', mp.status);
app.post('/mp/checkout', express.json(), mp.createCheckout);
app.post('/mp/webhook', mp.webhook);

console.log('✅ Passou por todos os middlewares... pronto pra escutar');

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log('Supabase conectado →', process.env.SUPABASE_URL);
});
