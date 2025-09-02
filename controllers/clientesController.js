// controllers/clientesController.js

const supabase = require('../services/supabase');

const generateClientIds = require('../utils/generateClientIds');
const logAdminAction = require('../utils/logAdminAction');
const { toCSV, cell, keepAsText, formatDate } = require('../utils/csv');

// ====== Create (cadastro simples via admin) ======
exports.createCliente = async (req, res) => {
  try {
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

// ---- utils de normalização/validação ----
const PLANOS_ACEITOS = ["Essencial", "Platinum", "Black"];
exports.PLANOS_ACEITOS = PLANOS_ACEITOS;

function normalizePlano(input) {
  if (!input || typeof input !== "string") return null;
  const s = input.trim().toLowerCase();
  const mapa = {
    "essencial": "Essencial",
    "platinum": "Platinum",
    "black": "Black",
  };
  return mapa[s] || null;
}

function onlyDigits(s) {
  return (typeof s === "string" ? s.replace(/\D+/g, "") : "");
}
function isCpfValido(cpf) {
  const c = onlyDigits(cpf);
  if (!c || c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false;

  let soma = 0, resto;
  for (let i = 1; i <= 9; i++) soma += parseInt(c.substring(i-1, i), 10) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(c.substring(9, 10), 10)) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(c.substring(i-1, i), 10) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(c.substring(10, 11), 10)) return false;

  return true;
}

// == Constantes de domínio ==
const STATUS = new Set(["ativo", "inativo"]);
const METODOS_PAGAMENTO = new Set(["pix", "cartao_debito", "cartao_credito", "dinheiro"]);

// Validação e normalização de payload de cliente
function parseCliente(raw = {}) {
  const errors = [];
  const cpf = onlyDigits(raw.cpf);
  const nome = (raw.nome || '').toString().trim();
  const email = raw.email !== undefined ? String(raw.email).trim() : undefined;
  const telefone = raw.telefone !== undefined ? String(raw.telefone).trim() : undefined;
  let plano = raw.plano;
  let status = raw.status;
  let metodo_pagamento = raw.metodo_pagamento;
  let pagamento_em_dia = raw.pagamento_em_dia;
  let vencimento = raw.vencimento;

  if (!isCpfValido(cpf)) errors.push('cpf inválido');
  if (!nome) errors.push('nome obrigatório');

  if (plano === undefined) {
    plano = undefined;
  } else if (plano === null || plano === '') {
    plano = null;
  } else {
    const p = normalizePlano(String(plano));
    if (!p) {
      errors.push('plano inválido');
    } else {
      plano = p;
    }
  }

  if (status === undefined || status === null || status === '') {
    status = 'ativo';
  } else {
    const s = String(status).trim().toLowerCase();
    if (!STATUS.has(s)) {
      errors.push('status inválido');
    } else {
      status = s;
    }
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
    let { q, limit, offset } = req.query;
    limit = Number(limit) > 0 ? Number(limit) : 20;
    offset = Number(offset) >= 0 ? Number(offset) : 0;

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (q && String(q).trim()) {
      const raw = String(q).trim();
      const term = `%${raw}%`;

      // Monta OR com email incluso
      const conds = [
        `nome.ilike.${term}`,
        `cpf.ilike.${term}`,
        `telefone.ilike.${term}`,
        `email.ilike.${term}`,
      ];

      // Se parece email, prioriza também igualdade exata
      if (raw.includes('@')) {
        conds.unshift(`email.eq.${raw}`);
      }

      query = query.or(conds.join(','));
    }

    const { data, error, count } = await query;
    if (error) return next(error);

    return res.json({
      rows: data || [],
      total: count ?? (data ? data.length : 0),
    });
  } catch (err) {
    return next(err);
  }
};

exports.exportCsv = async (req, res, next) => {
  try {
    
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('cpf,nome,email,telefone,plano,status,metodo_pagamento,created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const headers = [
      'cpf',
      'nome',
      'email',
      'telefone',
      'plano',
      'status',
      'metodo_pagamento',
      'created_at',
    ];

    const rows = (clientes || []).map((c) => [
      keepAsText(c.cpf ?? ''),
      cell(c.nome ?? ''),
      cell(c.email ?? ''),
      keepAsText(c.telefone ?? ''),
      cell(c.plano ?? ''),
      cell(c.status ?? ''),
      cell(c.metodo_pagamento ?? ''),
      cell(formatDate(c.created_at)),
    ]);

    const csv = toCSV({ headers, rows });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `clientes-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
};

// ===== Upsert de um único cliente (por CPF) =====
exports.create = async (req, res, next) => {
  try {
    const body = req.body || {};

    if (!body.nome || String(body.nome).trim().length < 2) {
      return res.status(400).json({ ok: false, error: 'nome inválido' });
    }
    body.nome = String(body.nome).trim();

    if (body.cpf != null) {
      body.cpf = onlyDigits(String(body.cpf));
      if (body.cpf && !isCpfValido(body.cpf)) {
        return res.status(400).json({ ok: false, error: 'cpf inválido' });
      }
    }

    if (body.plano != null) {
      const p = normalizePlano(String(body.plano));
      if (!p) return res.status(400).json({ ok: false, error: 'plano inválido' });
      body.plano = p;
    }

    if (body.status != null) {
      const s = String(body.status).trim().toLowerCase();
      if (!['ativo', 'inativo'].includes(s)) {
        return res.status(400).json({ ok: false, error: 'status inválido' });
      }
      body.status = s;
    } else {
      body.status = 'ativo';
    }

    if (body.metodo_pagamento !== undefined) {
      if (body.metodo_pagamento === null || body.metodo_pagamento === '') {
        body.metodo_pagamento = null;
      } else {
        const m = String(body.metodo_pagamento).trim();
        if (!METODOS_PAGAMENTO.has(m)) {
          return res.status(400).json({ ok: false, error: 'metodo_pagamento inválido' });
        }
        body.metodo_pagamento = m;
      }
    }

    if (req.adminId != null) body.last_admin_id = req.adminId;
    if (req.adminNome != null) body.last_admin_nome = req.adminNome;

    const { data, error } = await supabase
      .from('clientes')
      .upsert(body, { onConflict: 'cpf' })
      .select('*')
      .single();
    if (error) return next(error);
    await logAdminAction({
      route: '/admin/clientes',
      action: 'create',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      clientCpf: body.cpf,
      payload: body
    });
    return res.status(201).json({ ok: true, data });
  } catch (err) {
    return next(err);
  }
};
exports.upsertOne = exports.create;

// ===== Atualizar por CPF =====
exports.update = async (req, res, next) => {
  try {
    const cpf = onlyDigits(req.params.cpf || '');
    if (!isCpfValido(cpf)) {
      return res.status(400).json({ ok: false, error: 'cpf inválido' });
    }

    const body = { ...(req.body || {}) };
    delete body.cpf;

    if (body.nome != null) {
      if (!String(body.nome).trim() || String(body.nome).trim().length < 2) {
        return res.status(400).json({ ok: false, error: 'nome inválido' });
      }
      body.nome = String(body.nome).trim();
    }

    if (body.cpf != null) {
      body.cpf = onlyDigits(String(body.cpf));
      if (body.cpf && !isCpfValido(body.cpf)) {
        return res.status(400).json({ ok: false, error: 'cpf inválido' });
      }
    }

    if (body.plano != null) {
      const p = normalizePlano(String(body.plano));
      if (!p) return res.status(400).json({ ok: false, error: 'plano inválido' });
      body.plano = p;
    }

    if (body.status != null) {
      const s = String(body.status).trim().toLowerCase();
      if (!['ativo', 'inativo'].includes(s)) {
        return res.status(400).json({ ok: false, error: 'status inválido' });
      }
      body.status = s;
    }

    if (body.metodo_pagamento !== undefined) {
      if (body.metodo_pagamento === null || body.metodo_pagamento === '') {
        body.metodo_pagamento = null;
      } else {
        const m = String(body.metodo_pagamento).trim();
        if (!METODOS_PAGAMENTO.has(m)) {
          return res.status(400).json({ ok: false, error: 'metodo_pagamento inválido' });
        }
        body.metodo_pagamento = m;
      }
    }

    if (Object.keys(body).length === 0) {
      return res.status(400).json({ ok: false, error: 'sem campos para atualizar' });
    }

    if (req.adminId != null) body.last_admin_id = req.adminId;
    if (req.adminNome != null) body.last_admin_nome = req.adminNome;

    const { data, error } = await supabase
      .from('clientes')
      .update(body)
      .eq('cpf', cpf)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ ok: false, error: 'não encontrado' });
      }
      return next(error);
    }
    await logAdminAction({
      route: '/admin/clientes/:cpf',
      action: 'update',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      clientCpf: cpf,
      payload: body
    });
    return res.json({ ok: true, cliente: data });
  } catch (err) {
    return next(err);
  }
};
exports.updateOne = exports.update;

// ===== Upsert em lote =====
exports.bulkUpsert = async (req, res, next) => {
  try {
    
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
      v.data.last_admin_id = req.adminId;
      v.data.last_admin_nome = req.adminNome;
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
    await logAdminAction({
      route: '/admin/clientes/bulk',
      action: 'import',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      payload: { size: lista.length, inserted, updated, invalid, duplicates }
    });
    return res.json({ inserted, updated, invalid, duplicates });
  } catch (err) {
    return next(err);
  }
};

// ===== Remover por CPF =====
exports.remove = async (req, res, next) => {
  try {
    
    const cpf = onlyDigits(req.params.cpf || '');
    if (!isCpfValido(cpf)) {
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
    await logAdminAction({
      route: '/admin/clientes/:cpf',
      action: 'delete',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      clientCpf: cpf,
      payload: null
    });
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
};

// ===== Gerar IDs de clientes (utilitário) =====
exports.generateIds = async (req, res, next) => {
    try {
    const { scanned, updated } = await generateClientIds();
    await logAdminAction({
      route: '/admin/clientes/generate-ids',
      action: 'generate_ids',
      adminId: req.adminId,
      adminNome: req.adminNome,
      pinHash: req.adminPinHash,
      payload: { scanned, updated }
    });
    return res.json({ ok: true, scanned, updated });
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
