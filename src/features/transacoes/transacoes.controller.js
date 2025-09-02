const supabase = require('../../../services/supabase');

const TB_TRANS = 'transacoes';
const TB_CLIENTES = 'clientes';

// descontos por plano (em %)
const DESCONTOS = {
  Essencial: 5,
  Platinum: 10,
  Black: 20,
};

function normalizePlano(p) {
  if (!p) return null;
  const s = String(p).trim().toLowerCase();
  if (s === 'essencial') return 'Essencial';
  if (s === 'platinum') return 'Platinum';
  if (s === 'black') return 'Black';
  return null;
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

async function resolvePlanoFromCliente(cliente_id) {
  if (!cliente_id) return null;
  const { data, error } = await supabase
    .from(TB_CLIENTES)
    .select('plano')
    .eq('id', cliente_id)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Erro ao consultar cliente');
  if (data && data.plano) return normalizePlano(data.plano);
  return null;
}

async function preview(req, res, next) {
  try {
    const body = req.body || {};
    const valorOriginal = Number(body.valor_original);
    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
      return res.status(400).json({ ok: false, error: 'valor_original inválido' });
    }

    let plano = normalizePlano(body.plano);
    if (!plano && body.cliente_id != null) {
      plano = await resolvePlanoFromCliente(body.cliente_id);
    }
    if (!plano) {
      return res.status(400).json({ ok: false, error: 'plano não informado e não encontrado no cliente' });
    }

    const desconto = DESCONTOS[plano] ?? 0;
    const valorFinal = round2(valorOriginal * (1 - desconto / 100));

    return res.json({
      ok: true,
      data: {
        plano,
        desconto_aplicado: desconto,
        valor_original: round2(valorOriginal),
        valor_final: valorFinal,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = req.body || {};
    const valorOriginal = Number(body.valor_original);
    if (!Number.isFinite(valorOriginal) || valorOriginal <= 0) {
      return res.status(400).json({ ok: false, error: 'valor_original inválido' });
    }

    let plano = normalizePlano(body.plano);
    if (!plano && body.cliente_id != null) {
      plano = await resolvePlanoFromCliente(body.cliente_id);
    }
    if (!plano) {
      return res.status(400).json({ ok: false, error: 'plano não informado e não encontrado no cliente' });
    }

    const desconto = DESCONTOS[plano] ?? 0;
    const valorFinal = round2(valorOriginal * (1 - desconto / 100));

    const last_admin_id = req.adminId || req.headers['x-admin-id'] || '1';
    const last_admin_nome = req.adminNome || req.headers['x-admin-name'] || 'admin';

    const payload = {
      cliente_id: body.cliente_id ?? null,
      plano,
      valor_original: round2(valorOriginal),
      desconto_aplicado: round2(desconto),
      valor_final: valorFinal,
      metodo_pagamento: body.metodo_pagamento || 'pix',
      status_pagamento: body.status_pagamento || 'pendente',
      documento: body.documento ?? null,
      email: body.email ?? null,
      observacoes: body.observacoes ?? null,
      vencimento: body.vencimento ?? null,
      last_admin_id,
      last_admin_nome,
      last_admin_name: last_admin_nome,
    };

    const { data, error } = await supabase
      .from(TB_TRANS)
      .insert(payload)
      .select('*')
      .single();
    if (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Erro ao gravar transação' });
    }

    return res.status(201).json({ ok: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  preview,
  create,
};
