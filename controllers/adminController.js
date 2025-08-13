const supabase = require('../supabaseClient');
const { assertSupabase } = supabase;
const generateClientIds = require('../utils/generateClientIds');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

exports.seed = async (req, res, next) => {
  if (!assertSupabase(res)) return;
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
    if (!assertSupabase(res)) return;
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
    if (!assertSupabase(res)) return;
    const updated = await generateClientIds();
    res.json({ updated });
  } catch (err) {
    next(err);
  }
};
