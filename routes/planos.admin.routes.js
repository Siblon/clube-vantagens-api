const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/planosController');
const supabase = require('../services/supabase');

router.get('/', ctrl.adminList);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/rename', ctrl.rename);

// ===================== Admin: Planos - Uso e Migração =====================

// GET /admin/planos/uso?nome=Plano
router.get('/uso', async (req, res, next) => {
  try {
    const { nome } = req.query;
    if (!nome) return res.status(400).json({ ok: false, error: 'nome é obrigatório' });

    const { data, error } = await supabase
      .from('clientes')
      .select('status', { count: 'exact', head: false })
      .eq('plano', nome);

    if (error) return next(error);

    const rows = data || [];
    const total = rows.length;
    const porStatus = rows.reduce((acc, cur) => {
      const k = cur.status || 'desconhecido';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});

    return res.json({ ok: true, nome, total, porStatus });
  } catch (err) {
    return next(err);
  }
});

// POST /admin/planos/migrar
// body: { from, to, dry_run?: boolean, only_status?: 'ativo' | 'inativo' }
router.post('/migrar', async (req, res, next) => {
  try {
    const { from, to, dry_run = false, only_status } = req.body || {};
    if (!from || !to) return res.status(400).json({ ok: false, error: 'from e to são obrigatórios' });
    if (from === to) return res.status(400).json({ ok: false, error: 'from e to devem ser diferentes' });

    const { data: planosTo, error: errTo } = await supabase
      .from('planos')
      .select('id, nome, ativo')
      .eq('nome', to)
      .limit(1);
    if (errTo) return next(errTo);
    if (!planosTo || planosTo.length === 0) {
      return res.status(400).json({ ok: false, error: `Plano destino '${to}' não existe` });
    }

    let qBase = supabase.from('clientes').select('id', { count: 'exact' }).eq('plano', from);
    if (only_status) qBase = qBase.eq('status', only_status);

    const { count, error: errCount } = await qBase;
    if (errCount) return next(errCount);

    if (dry_run) {
      return res.json({ ok: true, preview: true, from, to, only_status: only_status || null, count: count || 0 });
    }

    let qUpd = supabase
      .from('clientes')
      .update({
        plano: to,
        last_admin_id: String(req.adminId || ''),
        last_admin_nome: String(req.adminNome || ''),
        last_action_at: new Date().toISOString()
      })
      .eq('plano', from);

    if (only_status) qUpd = qUpd.eq('status', only_status);

    const { data: updData, error: errUpd } = await qUpd.select('id');
    if (errUpd) return next(errUpd);

    return res.json({
      ok: true,
      from,
      to,
      only_status: only_status || null,
      migrated: updData?.length || 0
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
