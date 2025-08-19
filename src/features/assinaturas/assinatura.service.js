const { assinaturaSchema } = require('./assinatura.schema.js');
const repo = require('./assinatura.repo.js');
const clientesRepo = require('../clientes/cliente.repo.js');
const { fromCents } = require('../../utils/currency.js');

// Lê inteiro (centavos) do ENV com fallback seguro
function envCents(name, fallback) {
  const raw = process.env[name];
  const n = raw !== undefined && raw !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return fallback;
  const cents = Math.max(0, Math.floor(n));
  return cents;
}

const PLAN_PRICES = {
  basico: envCents('PLAN_PRICE_BASICO', 4990),
  pro: envCents('PLAN_PRICE_PRO', 9990),
  premium: envCents('PLAN_PRICE_PREMIUM', 14990),
};

async function createAssinatura(payload) {
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

  const planoKey = String(data.plano || '').toLowerCase();
  const valor = PLAN_PRICES[planoKey] ?? null;
  const valorBRL = valor != null ? fromCents(valor) : null;

  const created = await repo.create({
    cliente_id: cliente.id,
    plano: planoKey,
    valor, // centavos
  });

  return {
    id: created.id,
    cliente_id: created.cliente_id,
    plano: created.plano,
    valor,
    valorBRL,
  };
}

module.exports = { createAssinatura, PLAN_PRICES };

