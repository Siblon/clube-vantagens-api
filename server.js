const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const assinaturaController = require('./controllers/assinaturaController');
const transacaoController = require('./controllers/transacaoController');
const adminController = require('./controllers/adminController');
const report = require('./controllers/reportController');
const lead = require('./controllers/leadController');
const { requireAdmin } = require('./middlewares/requireAdmin');
const mp = require('./controllers/mpController');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Usa JSON para quase todas as rotas, exceto o webhook do Mercado Pago
app.use((req, res, next) => {
  if (req.originalUrl === '/mp/webhook') return next();
  return express.json({ limit: '1mb' })(req, res, next);
});
app.use(express.static(path.join(__dirname, 'public')));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, version: 'v0.1.0' });
});

// Rotas
app.get('/assinaturas', assinaturaController.consultarPorCpf);
app.get('/assinaturas/listar', assinaturaController.listarTodas);
// simula a transação sem registrar
app.get('/transacao/preview', transacaoController.preview);
app.post('/transacao', transacaoController.registrar);
app.post('/admin/seed', requireAdmin, adminController.seed);
app.post('/admin/clientes/bulk', requireAdmin, adminController.bulkClientes);
app.get('/admin/relatorios/resumo', requireAdmin, report.resumo);
app.get('/admin/relatorios/transacoes.csv', requireAdmin, report.csv);
// público (landing)
app.post('/public/lead', express.json(), lead.publicCreate);

// admin (PIN)
app.get('/admin/leads', requireAdmin, lead.adminList);
app.get('/admin/leads.csv', requireAdmin, lead.adminExportCsv);
app.post('/admin/leads/approve', requireAdmin, lead.adminApprove);
app.post('/admin/leads/discard', requireAdmin, lead.adminDiscard);

// Mercado Pago
app.post('/mp/checkout', express.json(), mp.createCheckout);
// Usamos express.raw para capturar o corpo bruto e validar a assinatura do webhook
app.post('/mp/webhook', express.raw({ type: '*/*' }), mp.webhook);

console.log('✅ Passou por todos os middlewares... pronto pra escutar');

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log('Supabase conectado →', process.env.SUPABASE_URL);
});
