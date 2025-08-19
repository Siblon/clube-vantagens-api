const { assinaturaSchema } = require('./assinatura.schema.js');
const repo = require('./assinatura.repo.js');
const clientesRepo = require('../clientes/cliente.repo.js');
const { fromCents } = require('../../utils/currency.js');

const PLAN_PRICES = {
  basico: 4990,
  pro: 9990,
  premium: 14990,
};

async function createAssinatura(payload) {
  const data = assinaturaSchema.parse(payload);

  const cliente = await clientesRepo.findByEmail(data.email);
  if (!cliente) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }

  const valor = PLAN_PRICES[data.plano];

  const created = await repo.create({
    cliente_id: cliente.id,
    plano: data.plano,
    valor,
  });

  return { ...created, valorBRL: fromCents(created.valor) };
}

module.exports = { createAssinatura };
