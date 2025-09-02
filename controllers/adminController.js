const supabase = require('../services/supabase');
const generateClientIds = require('../utils/generateClientIds');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

exports.whoami = async (req, res) => {
  try {
    const adminId = req.adminId || null;
    if (!adminId) return res.status(401).json({ ok:false, error:'unauthorized' });

    const { data, error } = await supabase
      .from('admins')
      .select('id, nome, created_at')
      .eq('id', adminId)
      .single();

    if (error) {
      console.error('[whoami] supabase error', error);
      return res.status(503).json({ ok:false, error:'db_error', details: error.message || error });
    }

    return res.json({ ok:true, admin: data });
  } catch (err) {
    console.error('[whoami] unexpected', err);
    return res.status(500).json({ ok:false, error:'unexpected' });
  }
};

exports.seed = async (req, res, next) => {
    const registros = [
    {
      cpf: '11111111111',
      nome: 'Cliente Um',
      plano: 'Mensal',
      status: 'ativo',
      metodo_pagamento: 'pix'
    },
    {
      cpf: '22222222222',
      nome: 'Cliente Dois',
      plano: 'Semestral',
      status: 'ativo',
      metodo_pagamento: 'pix'
    },
    {
      cpf: '33333333333',
      nome: 'Cliente Três',
      plano: 'Anual',
      status: 'ativo',
      metodo_pagamento: 'pix'
    }
  ];

  const cpfs = registros.map(r => r.cpf);

  const { data: existentes, error: selectError } = await supabase
    .from('clientes')
    .select('cpf')
    .in('cpf', cpfs);

  if (selectError) {
    return next(selectError);
  }

  const { error: upsertError } = await supabase
    .from('clientes')
    .upsert(registros, { onConflict: 'cpf' });

  if (upsertError) {
    return next(upsertError);
  }

  const existentesSet = new Set((existentes || []).map(e => e.cpf));
  const inserted = registros.filter(r => !existentesSet.has(r.cpf)).length;
  const updated = registros.length - inserted;

  res.json({ ok: true, inserted, updated });
};

exports.bulkClientes = async (req, res, next) => {
  try {
        const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows) {
      const err = new Error('corpo inválido: informe { rows: [...] }');
      err.status = 400;
      return next(err);
    }

    const valid = [];
    const errors = [];
    const seen = new Set();
    let skipped = 0;

    rows.forEach((raw, idx) => {
      const cpf = sanitizeCpf(raw?.cpf || '');
      if (!cpf || cpf.length !== 11) {
        skipped++;
        errors.push({ index: idx, cpf, message: 'cpf inválido' });
        return;
      }
      if (seen.has(cpf)) {
        skipped++;
        errors.push({ index: idx, cpf, message: 'cpf duplicado' });
        return;
      }
      seen.add(cpf);

      const status = (raw?.status_pagamento || '').toString().trim().toLowerCase();
      const allowed = ['em dia', 'pendente', 'inadimplente'];
      if (!allowed.includes(status)) {
        skipped++;
        errors.push({ index: idx, cpf, message: 'status_pagamento inválido' });
        return;
      }

      let venc = (raw?.vencimento || '').toString().trim();
      if (venc) {
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(venc)) {
          const [d, m, y] = venc.split('/');
          venc = `${y}-${m}-${d}`;
        } else if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) {
          skipped++;
          errors.push({ index: idx, cpf, message: 'vencimento inválido' });
          return;
        }
      } else {
        venc = null;
      }

      valid.push({
        cpf,
        nome: (raw?.nome || '').toString().trim(),
        email: (raw?.email || '').toString().trim(),
        telefone: (raw?.telefone || '').toString().trim(),
        plano: (raw?.plano || '').toString().trim(),
        status_pagamento: status,
        vencimento: venc
      });
    });

    if (valid.length === 0) {
      return res.json({ inserted: 0, updated: 0, skipped, errors });
    }

    const cpfs = valid.map(v => v.cpf);
    const { data: existentes, error: selErr } = await supabase
      .from('clientes')
      .select('cpf')
      .in('cpf', cpfs);
    if (selErr) return next(selErr);

    const existentesSet = new Set((existentes || []).map(e => e.cpf));

    const { error: upErr } = await supabase
      .from('clientes')
      .upsert(valid, { onConflict: 'cpf' });
    if (upErr) return next(upErr);

    const inserted = valid.filter(v => !existentesSet.has(v.cpf)).length;
    const updated = valid.length - inserted;

    return res.json({ inserted, updated, skipped, errors });
  } catch (err) {
    return next(err);
  }
};

exports.generateIds = async (req, res, next) => {
  try {
        const updated = await generateClientIds();
    res.json({ updated });
  } catch (err) {
    next(err);
  }
};

exports.metrics = async (req, res, next) => {
  try {
        const db = supabase;

    const { data: totalRows, error: e1 } = await db
      .from('clientes')
      .select('id', { count: 'exact', head: true });
    if (e1) throw e1;
    const total = totalRows?.length ?? (totalRows === null ? 0 : totalRows);

    const countOf = async (column, value) => {
      const { count, error } = await db
        .from('clientes')
        .select('id', { count: 'exact', head: true })
        .eq(column, value);
      if (error) throw error;
      return count ?? 0;
    };

    const ativos = await countOf('status', 'ativo');
    const inativos = await countOf('status', 'inativo');

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { count: novos30, error: e2 } = await db
      .from('clientes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since.toISOString());
    if (e2) throw e2;

    const { data: byPlanoData, error: e3 } = await db
      .rpc('group_count', { table_name: 'clientes', group_col: 'plano' })
      .select();
    let byPlano = [];
    if (e3 || !Array.isArray(byPlanoData)) {
      const { data, error } = await db
        .from('clientes')
        .select('plano')
        .not('plano', 'is', null);
      if (error) throw error;
      const map = {};
      for (const r of data) map[r.plano || '—'] = (map[r.plano || '—'] || 0) + 1;
      byPlano = Object.entries(map).map(([key, count]) => ({ key, count }));
    } else {
      byPlano = byPlanoData.map((r) => ({ key: r.key ?? '—', count: r.count || 0 }));
    }

    const { data: byMetodoData, error: e4 } = await db
      .from('clientes')
      .select('metodo_pagamento');
    if (e4) throw e4;
    const mapMetodo = {};
    for (const r of byMetodoData || []) {
      const k = r.metodo_pagamento || '—';
      mapMetodo[k] = (mapMetodo[k] || 0) + 1;
    }
    const byMetodo = Object.entries(mapMetodo).map(([key, count]) => ({ key, count }));

    return res.json({
      ok: true,
      totals: { total, ativos, inativos, novos30 },
      byPlano,
      byMetodo,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    return next(err);
  }
};
