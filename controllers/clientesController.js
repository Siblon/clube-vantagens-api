let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../config/supabase'));
}
const { assertSupabase } = supabase;
const generateClientIds = require('../utils/generateClientIds');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

const PLANOS = new Set(['Mensal', 'Semestral', 'Anual']);
const STATUS = new Set(['ativo', 'inativo']);
const METODOS_PAGAMENTO = new Set(['pix', 'cartao_debito', 'cartao_credito', 'dinheiro']);

function parseCliente(raw = {}) {
  const errors = [];
  const cpf = sanitizeCpf(raw.cpf);
  const nome = (raw.nome || '').toString().trim();
  const plano = raw.plano;
  const status = raw.status;
  const metodo_pagamento = (raw.metodo_pagamento || '').toString().trim();
  let pagamento_em_dia = raw.pagamento_em_dia;
  let vencimento = raw.vencimento;

  if (!cpf || cpf.length !== 11) errors.push('cpf inválido');
  if (!nome) errors.push('nome obrigatório');
  if (!PLANOS.has(plano)) errors.push('plano inválido');
  if (!STATUS.has(status)) errors.push('status inválido');
  if (!METODOS_PAGAMENTO.has(metodo_pagamento)) errors.push('metodo_pagamento inválido');

  if (pagamento_em_dia !== undefined) {
    pagamento_em_dia = pagamento_em_dia === true || pagamento_em_dia === 'true' || pagamento_em_dia === 1 || pagamento_em_dia === '1';
  }

  if (vencimento) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(vencimento)) {
      const [d, m, y] = vencimento.split('/');
      vencimento = `${y}-${m}-${d}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      errors.push('vencimento inválido');
    }
  }

  return {
    ok: errors.length === 0,
    data: { cpf, nome, plano, status, metodo_pagamento, pagamento_em_dia, vencimento },
    errors
  };
}

exports.list = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const {
      status = '',
      q = '',
      plano = '',
      limit = 50,
      offset = 0
    } = req.query || {};

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (plano) query = query.eq('plano', plano);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`cpf.ilike.${like},nome.ilike.${like}`);
    }

    const { data, error, count } = await query.order('nome').range(off, off + lim - 1);

    if (error) return next(error);

    return res.json({ rows: data || [], total: count || 0 });
  } catch (err) {
    return next(err);
  }
};

exports.upsertOne = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const v = parseCliente(req.body || {});
    if (!v.ok) {
      const err = new Error(v.errors.join('; '));
      err.status = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('clientes')
      .upsert(v.data, { onConflict: 'cpf' })
      .select();

    if (error) return next(error);

    return res.json({ ok: true, data: data && data[0] });
  } catch (err) {
    return next(err);
  }
};

exports.bulkUpsert = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const lista = Array.isArray(req.body?.clientes) ? req.body.clientes : [];
    if (lista.length === 0) {
      const err = new Error('lista vazia');
      err.status = 400;
      return next(err);
    }
    if (lista.length > 200) {
      const err = new Error('máximo 200 registros por requisição');
      err.status = 400;
      return next(err);
    }

    const seen = new Set();
    const valid = [];
    let invalid = 0;
    let duplicates = 0;

    lista.forEach(raw => {
      const v = parseCliente(raw);
      if (!v.ok) { invalid++; return; }
      if (seen.has(v.data.cpf)) { duplicates++; return; }
      seen.add(v.data.cpf);
      valid.push(v.data);
    });

    if (valid.length === 0) {
      return res.json({ inserted: 0, updated: 0, invalid, duplicates });
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

    const updated = valid.filter(v => existentesSet.has(v.cpf)).length;
    const inserted = valid.length - updated;

    return res.json({ inserted, updated, invalid, duplicates });
  } catch (err) {
    return next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const cpf = sanitizeCpf(req.params.cpf || '');
    if (!cpf) {
      const err = new Error('cpf inválido');
      err.status = 400;
      return next(err);
    }

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('cpf', cpf);
    if (error) return next(error);

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

exports.generateIds = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const updated = await generateClientIds();
    return res.json({ updated });
  } catch (err) {
    return next(err);
  }
};
