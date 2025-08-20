// src/features/assinaturas/assinatura.service.js
const { assinaturaSchema } = require('./assinatura.schema.js');
const repo = require('./assinatura.repo.js');
const clientesRepo = require('../clientes/cliente.repo.js');

// Defaults (centavos)
const DEFAULT_PLAN_PRICES = {
  basico: 4990,
  pro: 9990,
  premium: 14990,
};

function envPlanPrice(plano) {
  const key = { basico: 'PLAN_PRICE_BASICO', pro: 'PLAN_PRICE_PRO', premium: 'PLAN_PRICE_PREMIUM' }[plano];
  if (!key) return null;
  const raw = process.env[key];
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
}

async function dbPlanPriceOrNull(plano, { supabase }) {
  if (!supabase || !supabase.from) return null;
  try {
    const { data, error } = await supabase
      .from('planos')
      .select('preco_centavos')
      .eq('nome', plano)
      .single();
    if (error || !data) return null;
    const n = Number(data.preco_centavos);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : null;
  } catch {
    return null;
  }
}

async function getPlanPrice(plano, ctx = {}) {
  const p = String(plano || 'basico').toLowerCase();
  const fromDb = await dbPlanPriceOrNull(p, ctx);
  if (fromDb != null) return fromDb;
  const fromEnv = envPlanPrice(p);
  if (fromEnv != null) return fromEnv;
  return DEFAULT_PLAN_PRICES[p] ?? DEFAULT_PLAN_PRICES.basico;
}

async function resolveCliente(data) {
  if (data.cliente_id) {
    return await clientesRepo.findById(data.cliente_id);
  }
  if (data.email) {
    return await clientesRepo.findByEmail(data.email);
  }
  if (data.documento) {
    // Compat: documento ou cpf
    const c = await clientesRepo.findByDocumento(data.documento);
    return c;
  }
  return null;
}

async function createAssinatura(payload, ctx = {}) {
  const data = assinaturaSchema.parse(payload);

  const cliente = await resolveCliente(data);
  if (!cliente) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }

  const planoKey = String(data.plano || 'basico').toLowerCase();
  const valor = await getPlanPrice(planoKey, ctx); // centavos

  const created = await repo.create({
    cliente_id: cliente.id,
    plano: planoKey,
    valor,
  });

  const cents = Number.isFinite(created?.valor) ? created.valor : valor;
  return {
    id: created.id,
    cliente_id: created.cliente_id,
    plano: created.plano,
    valor: cents,
    valorBRL: Number((cents / 100).toFixed(2)),
  };
}

module.exports = {
  createAssinatura,
  getPlanPrice,
  envPlanPrice,
  dbPlanPriceOrNull,
  DEFAULT_PLAN_PRICES,
};
