const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const assinaturaController = require('./controllers/assinaturaController');
const transacaoController = require('./controllers/transacaoController');
const adminController = require('./controllers/adminController');
const requireAdmin = require('./middlewares/requireAdmin');

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

// Rotas
app.get('/assinaturas', assinaturaController.consultarPorCpf);
app.get('/assinaturas/listar', assinaturaController.listarTodas);
// simula a transação sem registrar
app.get('/transacao/preview', transacaoController.preview);
app.post('/transacao', transacaoController.registrar);
app.post('/admin/seed', requireAdmin, adminController.seed);

console.log('✅ Passou por todos os middlewares... pronto pra escutar');

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log('Supabase conectado →', process.env.SUPABASE_URL);
});
