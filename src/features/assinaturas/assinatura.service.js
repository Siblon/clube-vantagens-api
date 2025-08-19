const { assinaturaSchema } = require('./assinatura.schema.js');
const repo = require('./assinatura.repo.js');
const clientesRepo = require('../clientes/cliente.repo.js');

const DEFAULT_PLAN_PRICES = {
  basico: 4990,
  pro: 7990,
  premium: 12990,
};

function envPlanPrice(plano) {
  const key = {
    basico: 'PLAN_PRICE_BASICO',
    pro: 'PLAN_PRICE_PRO',
    premium: 'PLAN_PRICE_PREMIUM',
  }[plano];
  if (!key) return null;
  const raw = process.env[key];
  const n = raw != null ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : null;
}

async function dbPlanPriceOrNull(plano, { supabase }) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('planos')
      .select('preco_centavos')
      .eq('nome', plano)
      .single();
    if (error || !data) return null;
    const n = Number(data.preco_centavos);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function getPlanPrice(plano, ctx = {}) {
  const fromDb = await dbPlanPriceOrNull(plano, ctx);
  if (fromDb != null) return fromDb;
  const fromEnv = envPlanPrice(plano);
  if (fromEnv != null) return fromEnv;
  return DEFAULT_PLAN_PRICES[plano] ?? DEFAULT_PLAN_PRICES.basico;
}

async function createAssinatura(payload, ctx = {}) {
  const data = assinaturaSchema.parse(payload);

  let cliente = null;
  if (data.cliente_id) {
    cliente = await clientesRepo.findById(data.cliente_id);
  } else if (data.email) {
    cliente = await clientesRepo.findByEmail(data.email);
  } else if (data.documento) {
    cliente = await clientesRepo.findByDocumento(data.documento);
  }

  if (!cliente) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }

  const planoKey = (data.plano || '').toLowerCase();
  const valor = await getPlanPrice(planoKey, ctx);
  const valorBRL = Number((valor / 100).toFixed(2));

  const created = await repo.create({
    cliente_id: cliente.id,
    plano: planoKey,
    valor,
  });

  return {
    id: created.id,
    cliente_id: created.cliente_id,
    plano: created.plano,
    valor,
    valorBRL,
  };
}

module.exports = {
  createAssinatura,
  getPlanPrice,
  envPlanPrice,
  dbPlanPriceOrNull,
  DEFAULT_PLAN_PRICES,
};

