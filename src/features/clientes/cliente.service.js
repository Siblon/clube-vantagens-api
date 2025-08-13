import { clienteSchema } from './cliente.schema.js';
import repo from './cliente.repo.js';

export async function createCliente(payload) {
  const data = clienteSchema.parse(payload);

  const existing = await repo.findByEmail(data.email);
  if (existing) {
    const err = new Error('Email já cadastrado');
    err.code = 'DUPLICATE_EMAIL';
    err.status = 409;
    throw err;
  }

  const created = await repo.create(data);
  return created;
}

export default { createCliente };
