const express = require('express');
const supabase = require('./services/supabase');

const app = express();

// body parser primeiro
app.use(express.json());

// CORS dinâmico
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '*')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Vary', 'Origin');

  if (ALLOWED_ORIGIN.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (origin && ALLOWED_ORIGIN.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-pin');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// /health simples e sempre JSON
app.get('/health', (req, res) => {
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.COMMIT_SHA || 'dev';
  res.json({ ok: true, version: 'v0.1.0', sha });
});

  // raiz
  app.get('/', (req, res) => res.json({ ok:true, service:'clube-vantagens-api' }));
  app.head('/', (req, res) => res.sendStatus(200));

const requireAdminPinModule = require('./middlewares/requireAdminPin');
const { requireAdminPin = requireAdminPinModule } = requireAdminPinModule;
const planosPublicRoutes = require('./routes/planos.public.routes');
const planosAdminRoutes  = require('./routes/planos.admin.routes');

app.use('/planos', planosPublicRoutes);
app.use('/admin/planos', requireAdminPin, planosAdminRoutes);

// ADMIN (static pages + API)
  const path = require('path');
  const clientesRouter = require('./routes/admin.routes');
  const clientesController = require('./controllers/clientesController');
  const clientesRoutes = require('./src/features/clientes/clientes.routes.js');
  const auditController = require('./controllers/auditController');
  const adminsController = require('./controllers/adminsController');
  const adminController = require('./controllers/adminController');
  const adminReportController = require('./controllers/adminReportController');
  const adminDiagRoutes = require('./routes/adminDiag');

let transacaoRoutes;
try { transacaoRoutes = require('./routes/transacao.routes'); } catch (e) {}
if (!transacaoRoutes) {
  try { transacaoRoutes = require('./src/routes/transacao'); } catch (e) {}
}
if (!transacaoRoutes) {
  transacaoRoutes = require('./controllers/transacaoController');
}

// páginas estáticas de /admin sem PIN
app.use('/admin', express.static(path.join(__dirname, 'public', 'admin')));

// rotas de API de admin
app.get('/admin/clientes/export', requireAdminPin, clientesController.exportCsv);
app.use('/admin/clientes', clientesRouter);
app.use('/admin/clientes', requireAdminPin, clientesRoutes);
app.get('/admin/audit', requireAdminPin, auditController.list);
app.get('/admin/audit/export', requireAdminPin, auditController.exportAudit);
app.get('/admin/admins', requireAdminPin, adminsController.listAdmins);
app.post('/admin/admins', requireAdminPin, adminsController.createAdmin);
app.put('/admin/admins/:id/pin', requireAdminPin, adminsController.updateAdminPin);
app.delete('/admin/admins/:id', requireAdminPin, adminsController.deleteAdmin);
app.get('/admin/metrics', requireAdminPin, adminController.metrics);
app.get('/admin/report/summary', requireAdminPin, adminReportController.summary);
app.get('/admin/report/csv', requireAdminPin, adminReportController.csv);
app.get('/admin/whoami', requireAdminPin, adminController.whoami);
app.use('/admin', adminDiagRoutes);

// ===================== Admin: Transações =====================

// ===== Admin: Resumo de transações e alteração de status =====
const ALLOWED_STATUS = ['pendente', 'pago', 'cancelado'];

// Helper: monta query com filtros comuns
function buildTransacoesQuery(params) {
  const { cpf, desde, ate, status } = params || {};
  let q = supabase
    .from('transacoes')
    .select('id, valor_original, valor_final, status_pagamento, created_at', { count: 'exact' });

  if (cpf) q = q.ilike('cpf', `%${cpf.replace(/\D/g, '')}%`);
  if (status) q = q.eq('status_pagamento', status);
  if (desde) q = q.gte('created_at', new Date(desde).toISOString());
  if (ate) {
    // inclui o dia 'ate' inteiro (23:59:59.999)
    const end = new Date(ate + 'T23:59:59.999');
    q = q.lte('created_at', end.toISOString());
  }
  return q;
}

app.get('/admin/transacoes', requireAdminPin, async (req, res, next) => {
  try {
    const {
      cpf,
      metodo_pagamento,
      status_pagamento,
      desde,
      ate,
      limit = '20',
      offset = '0',
      order = 'created_at.desc'
    } = req.query;

    let q = supabase
      .from('transacoes')
      .select(
        'id, cpf, valor_original, valor_final, desconto_aplicado, metodo_pagamento, status_pagamento, created_at',
        { count: 'exact' }
      );

    if (cpf) q = q.ilike('cpf', `%${cpf.replace(/\D/g, '')}%`);
    if (metodo_pagamento) q = q.eq('metodo_pagamento', metodo_pagamento);
    if (status_pagamento) q = q.eq('status_pagamento', status_pagamento);
    if (desde) q = q.gte('created_at', new Date(desde).toISOString());
    if (ate) q = q.lte('created_at', new Date(ate).toISOString());

    const [col, dir] = String(order).split('.');
    if (col) q = q.order(col, { ascending: String(dir).toLowerCase() !== 'desc' });

    const l = parseInt(limit, 10);
    const o = parseInt(offset, 10);

    const { data, error, count } = await q.range(o, o + l - 1);
    if (error) return next(error);

    return res.json({ ok: true, rows: data ?? [], total: count ?? 0 });
  } catch (err) {
    return next(err);
  }
});

// GET /admin/transacoes/csv (exporta CSV com os mesmos filtros)
app.get('/admin/transacoes/csv', requireAdminPin, async (req, res, next) => {
  try {
    const {
      cpf,
      metodo_pagamento,
      status_pagamento,
      desde,
      ate,
      order = 'created_at.desc',
      max = '5000'
    } = req.query;

    let q = supabase
      .from('transacoes')
      .select(
        'id, cpf, valor_original, valor_final, desconto_aplicado, metodo_pagamento, status_pagamento, created_at'
      );

    if (cpf) q = q.ilike('cpf', `%${cpf.replace(/\D/g, '')}%`);
    if (metodo_pagamento) q = q.eq('metodo_pagamento', metodo_pagamento);
    if (status_pagamento) q = q.eq('status_pagamento', status_pagamento);
    if (desde) q = q.gte('created_at', new Date(desde).toISOString());
    if (ate) q = q.lte('created_at', new Date(ate).toISOString());

    const [col, dir] = String(order).split('.');
    if (col) q = q.order(col, { ascending: String(dir).toLowerCase() !== 'desc' });

    const { data, error } = await q.limit(parseInt(max, 10));
    if (error) return next(error);

    const rows = data ?? [];
    const header = [
      'id',
      'cpf',
      'valor_original',
      'valor_final',
      'desconto_aplicado',
      'metodo_pagamento',
      'status_pagamento',
      'created_at'
    ];
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          esc(r.id),
          esc(r.cpf),
          esc(r.valor_original),
          esc(r.valor_final),
          esc(r.desconto_aplicado),
          esc(r.metodo_pagamento),
          esc(r.status_pagamento),
          esc(r.created_at)
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transacoes.csv"');
    return res.send(lines.join('\n'));
  } catch (err) {
    return next(err);
  }
});

// GET /admin/transacoes/resumo?cpf&desde&ate&status
app.get('/admin/transacoes/resumo', requireAdminPin, async (req, res, next) => {
  try {
    const { data, count, error } = await buildTransacoesQuery({
      ...req.query,
      status: req.query.status || req.query.status_pagamento,
    });
    if (error) return next(error);

    const total = count ?? (data?.length || 0);
    let somaBruta = 0,
      somaFinal = 0;
    const porStatus = {};

    for (const t of data || []) {
      const vo = Number(t.valor_original || 0);
      const vf = Number(t.valor_final || 0);
      somaBruta += vo;
      somaFinal += vf;
      const st = t.status_pagamento || 'pendente';
      porStatus[st] = (porStatus[st] || 0) + 1;
    }

    const descontoTotal = somaBruta - somaFinal;
    const descontoMedioPercent =
      somaBruta > 0
        ? Math.round(((descontoTotal / somaBruta) * 100) * 100) / 100
        : 0;
    const ticketMedio = total > 0 ? Math.round((somaFinal / total) * 100) / 100 : 0;

    return res.json({
      ok: true,
      total,
      somaBruta,
      somaFinal,
      descontoTotal,
      descontoMedioPercent,
      ticketMedio,
      porStatus,
    });
  } catch (err) {
    return next(err);
  }
});

// PATCH /admin/transacoes/:id  body: { status_pagamento: 'pago' | 'cancelado' | 'pendente' }
app.patch('/admin/transacoes/:id', requireAdminPin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'id inválido' });

    const { status_pagamento, metodo_pagamento, observacoes } = req.body || {};
    if (!ALLOWED_STATUS.includes(status_pagamento)) {
      return res
        .status(400)
        .json({ ok: false, error: 'status_pagamento inválido' });
    }

    const updates = {
      status_pagamento,
      last_admin_id: String(req.adminId || ''),
      last_admin_nome: String(req.adminNome || ''),
      last_action_at: new Date().toISOString(),
    };

    if (metodo_pagamento !== undefined) updates.metodo_pagamento = metodo_pagamento;
    if (observacoes !== undefined) updates.observacoes = observacoes;

    // se colunas existirem, atualize; se não existirem, ignore
    if (status_pagamento === 'pago') {
      updates.paid_at = new Date().toISOString();
      updates.canceled_at = null;
    } else if (status_pagamento === 'cancelado') {
      updates.canceled_at = new Date().toISOString();
      updates.paid_at = null;
    } else {
      updates.paid_at = null;
      updates.canceled_at = null;
    }

    const { data, error } = await supabase
      .from('transacoes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res
          .status(404)
          .json({ ok: false, error: 'transação não encontrada' });
      }
      return next(error);
    }

    return res.json({ ok: true, data });
  } catch (err) {
    return next(err);
  }
});

const hasSupabase =
  !!process.env.SUPABASE_URL &&
  !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON);

if (hasSupabase) {
  const mpController = require('./controllers/mpController');
  app.post('/admin/mp/checkout', requireAdminPin, mpController.checkout);
  app.post('/webhooks/mp', mpController.webhook);
} else {
  console.log('[MP] Rotas de MP não montadas: variáveis do Supabase ausentes.');
}

// transações (protegidas por PIN)
app.use('/transacao', requireAdminPin, transacaoRoutes);


// /__routes opcional e protegido por PIN
function listRoutesSafe(app) {
  const out = [];
  const stack = app && app._router && Array.isArray(app._router.stack) ? app._router.stack : [];
  for (const layer of stack) {
    if (layer && layer.route && layer.route.path) {
      const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
      out.push({ path: layer.route.path, methods });
    }
    if (layer && layer.name === 'router' && layer.handle && Array.isArray(layer.handle.stack)) {
      for (const s of layer.handle.stack) {
        if (s && s.route && s.route.path) {
          const methods = Object.keys(s.route.methods || {}).map(m => m.toUpperCase());
          out.push({ path: s.route.path, methods });
        }
      }
    }
  }
  return out;
}
if (process.env.DIAG_ROUTES === '1') {
    app.get('/__routes', requireAdminPin, (req, res) => {
      try {
        const routes = listRoutesSafe(app);
        return res.json({ ok: true, count: routes.length, routes });
      } catch (e) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    });
  }

// static
app.use(express.static(require('path').join(__dirname, 'public')));

// 404
app.use((req, res) => res.status(404).send(`Cannot ${req.method} ${req.path}`));

// Error handler padrão (deixe por último)
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const msg = err.message || 'unexpected';
  if (status >= 500) {
    console.error('[ERROR]', { path: req.path, msg, stack: err.stack });
  }
  res.status(status).json({ ok:false, error: msg });
});

const PORT = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`));
}

module.exports = app;
