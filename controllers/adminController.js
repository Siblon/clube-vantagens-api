const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

exports.seed = async (req, res) => {
  if (!assertSupabase(res)) return;
  const registros = [
    { cpf: '11111111111', nome: 'Cliente Um', plano: 'Essencial', status: 'ativo' },
    { cpf: '22222222222', nome: 'Cliente Dois', plano: 'Platinum', status: 'ativo' },
    { cpf: '33333333333', nome: 'Cliente Três', plano: 'Black', status: 'ativo' }
  ];

  const cpfs = registros.map(r => r.cpf);

  const { data: existentes, error: selectError } = await supabase
    .from('clientes')
    .select('cpf')
    .in('cpf', cpfs);

  if (selectError) {
    return res.status(500).json({ error: selectError.message });
  }

  const { error: upsertError } = await supabase
    .from('clientes')
    .upsert(registros, { onConflict: 'cpf' });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  const existentesSet = new Set((existentes || []).map(e => e.cpf));
  const inserted = registros.filter(r => !existentesSet.has(r.cpf)).length;
  const updated = registros.length - inserted;

  res.json({ ok: true, inserted, updated });
};

exports.bulkClientes = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows) {
      return res.status(400).json({ error: 'corpo inválido: informe { rows: [...] }' });
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
    if (selErr) return res.status(500).json({ error: selErr.message });

    const existentesSet = new Set((existentes || []).map(e => e.cpf));

    const { error: upErr } = await supabase
      .from('clientes')
      .upsert(valid, { onConflict: 'cpf' });
    if (upErr) return res.status(500).json({ error: upErr.message });

    const inserted = valid.filter(v => !existentesSet.has(v.cpf)).length;
    const updated = valid.length - inserted;

    return res.json({ inserted, updated, skipped, errors });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

function gerarIdInterno() {
  const digits = '23456789';
  let out = 'C';
  for (let i = 0; i < 7; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

async function gerarIdUnico() {
  while (true) {
    const id = gerarIdInterno();
    const { data, error } = await supabase
      .from('clientes')
      .select('id')
      .eq('id_interno', id)
      .maybeSingle();
    if (!error && !data) return id;
  }
}

exports.generateIds = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id')
      .is('id_interno', null);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let updated = 0;
    for (const cli of clientes || []) {
      const novoId = await gerarIdUnico();
      const { error: updErr } = await supabase
        .from('clientes')
        .update({ id_interno: novoId })
        .eq('id', cli.id);
      if (!updErr) updated += 1;
    }

    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
