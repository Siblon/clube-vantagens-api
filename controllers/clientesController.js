// controllers/clientesController.js

const { supabase, assertSupabase } = require('../supabaseClient');

const generateClientIds = require('../utils/generateClientIds');

// ====== Create (cadastro simples via admin) ======
exports.createCliente = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const { nome, email, telefone } = req.body || {};
    if (!nome || !email) return res.status(400).json({ ok: false, error: 'missing_fields' });
    const { data, error } = await supabase
      .from('clientes')
      .insert([{ nome, email, telefone }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return res.status(201).json({ ok: true, cliente: data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
};

// == Utils ==
function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

function isValidCpf(value = '') {
  const cpf = (value.match(/\d/g) || []).join('');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (factor) => {
    let sum = 0;
    for (let i = 0; i < factor - 1; i++) sum += +cpf[i] * (factor - i);
    const d = (sum * 10) % 11;
    return d === 10 ? 0 : d;
  };
  return calc(10) === +cpf[9] && calc(11) === +cpf[10];
}

// == Constantes de domínio ==
const PLANOS = new Set(['Mensal', 'Semestral', 'Anual']);
const STATUS = new Set(['ativo', 'inativo']);
const METODOS_PAGAMENTO = new Set(['pix', 'cartao_debito', 'cartao_credito', 'dinheiro']);

// Validação e normalização de payload de cliente
function parseCliente(raw = {}) {
  const errors = [];
  const cpf = sanitizeCpf(raw.cpf);
  const nome = (raw.nome || '').toString().trim();
  const email = raw.email !== undefined ? String(raw.email).trim() : undefined;
  const telefone = raw.telefone !== undefined ? String(raw.telefone).trim() : undefined;
  let plano = raw.plano;
  let status = raw.status;
  let metodo_pagamento = raw.metodo_pagamento;
  let pagamento_em_dia = raw.pagamento_em_dia;
  let vencimento = raw.vencimento;

  if (!isValidCpf(cpf)) errors.push('cpf inválido');
  if (!nome) errors.push('nome obrigatório');

  if (plano === undefined) {
    plano = undefined;
  } else if (plano === null || plano === '') {
    plano = null;
  } else if (!PLANOS.has(plano)) {
    errors.push('plano inválido');
  }

  if (status === undefined || status === null || status === '') {
    status = 'ativo';
  } else if (!STATUS.has(status)) {
    errors.push('status inválido');
  }

  if (metodo_pagamento === undefined) {
    metodo_pagamento = undefined;
  } else if (metodo_pagamento === null || metodo_pagamento === '') {
    metodo_pagamento = null;
  } else {
    metodo_pagamento = metodo_pagamento.toString().trim();
    if (!METODOS_PAGAMENTO.has(metodo_pagamento)) {
      errors.push('metodo_pagamento inválido');
    }
  }

  if (pagamento_em_dia !== undefined) {
    pagamento_em_dia =
      pagamento_em_dia === true ||
      pagamento_em_dia === 'true' ||
      pagamento_em_dia === 1 ||
      pagamento_em_dia === '1';
  }

  if (vencimento !== undefined) {
    // aceita dd/mm/yyyy e converte para yyyy-mm-dd
    if (typeof vencimento === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(vencimento)) {
      const [d, m, y] = vencimento.split('/');
      vencimento = `${y}-${m}-${d}`;
    }
    if (vencimento && !/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      errors.push('vencimento inválido');
    }
    if (!vencimento) vencimento = undefined;
  }

  const data = { cpf, nome };
  if (plano !== undefined) data.plano = plano;
  if (status !== undefined) data.status = status;
  if (metodo_pagamento !== undefined) data.metodo_pagamento = metodo_pagamento;
  if (email !== undefined) data.email = email;
  if (telefone !== undefined) data.telefone = telefone;
  if (pagamento_em_dia !== undefined) data.pagamento_em_dia = pagamento_em_dia;
  if (vencimento !== undefined) data.vencimento = vencimento;

  return {
    ok: errors.length === 0,
    data,
    errors
  };
}

// ===== Listar clientes (paginado/filtrado) =====
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
      // Busca por CPF ou nome (ilike = case-insensitive)
      query = query.or(`cpf.ilike.${like},nome.ilike.${like}`);
    }

    const { data, error, count } = await query
      .order('nome')
      .range(off, off + lim - 1);

    if (error) return next(error);

    return res.json({ rows: data || [], total: count || 0 });
  } catch (err) {
    return next(err);
  }
};

// ===== Upsert de um único cliente (por CPF) =====
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

    return res.json({ ok: true, data: data[0] });
  } catch (err) {
    return next(err);
  }
};

// ===== Atualizar por CPF =====
exports.updateByCpf = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;

    const cpf = sanitizeCpf(req.params.cpf || '');
    if (cpf.length !== 11) {
      const err = new Error('cpf inválido');
      err.status = 400;
      return next(err);
    }

    if (req.body?.cpf !== undefined && sanitizeCpf(req.body.cpf) !== cpf) {
      const err = new Error('cpf não pode ser alterado');
      err.status = 400;
      return next(err);
    }

    const v = parseCliente({ ...(req.body || {}), cpf });
    if (!v.ok) {
      const err = new Error(v.errors.join('; '));
      err.status = 400;
      return next(err);
    }

    const { data, error } = await supabase
      .from('clientes')
      .update(v.data)
      .eq('cpf', cpf)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        const err = new Error('não encontrado');
        err.status = 404;
        return next(err);
      }
      return next(error);
    }

    return res.json({ ok: true, cliente: data });
  } catch (err) {
    return next(err);
  }
};

// ===== Upsert em lote =====
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

// ===== Remover por CPF =====
exports.remove = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;

    const cpf = sanitizeCpf(req.params.cpf || '');
    if (cpf.length !== 11) {
      const err = new Error('cpf inválido');
      err.status = 400;
      return next(err);
    }

    const { error, count } = await supabase
      .from('clientes')
      .delete({ count: 'exact', returning: 'minimal' })
      .eq('cpf', cpf);
    if (error) return next(error);
    if (count === 0) {
      const err = new Error('não encontrado');
      err.status = 404;
      return next(err);
    }

    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// ===== Gerar IDs de clientes (utilitário) =====
exports.generateIds = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  try {
    const { updated } = await generateClientIds();
    return res.json({ updated });
  } catch (err) {
    // Postgres: missing column
    if (
      err?.code === '42703' ||
      /column .* does not exist/i.test(err?.message || '')
    ) {
      return res.status(400).json({
        ok: false,
        error: 'missing_column',
        detail: 'Crie a coluna id_interno em public.clientes.'
      });
    }
    return next(err);
  }
};
