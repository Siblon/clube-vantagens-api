import { assinaturaSchema } from './assinatura.schema.js';
import repo from './assinatura.repo.js';
import clientesRepo from '../clientes/cliente.repo.js';
import { toCents, fromCents } from '../../utils/currency.js';

const PLAN_VALUES = {
  basico: '49,90',
  pro: '99,90',
  premium: '149,90',
};

export async function createAssinatura(payload) {
  const data = assinaturaSchema.parse(payload);

  const cliente = await clientesRepo.findByEmail(data.email);
  if (!cliente) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    throw err;
  }

  const valorBRL = data.valor ?? PLAN_VALUES[data.plano];
  const valor = toCents(valorBRL);

  const created = await repo.create({
    cliente_id: cliente.id,
    plano: data.plano,
    valor,
  });

  return { ...created, valorBRL: fromCents(created.valor) };
}

export default { createAssinatura };
