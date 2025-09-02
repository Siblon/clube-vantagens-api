const { z } = require('zod');

const cleanDigits = (s) => (typeof s === 'string' ? s.replace(/\D+/g, '') : s);

const ClienteCreateSchema = z.object({
  nome: z.string().min(2, 'Nome muito curto'),
  cpf: z.string().optional().transform(cleanDigits),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional(),
  plano: z.enum(['Essencial', 'Platinum', 'Black']).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
});

const ClienteUpdateSchema = z.object({
  nome: z.string().min(2).optional(),
  cpf: z.string().optional().transform(cleanDigits),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido').optional(),
  plano: z.enum(['Essencial', 'Platinum', 'Black']).optional(),
  status: z.enum(['ativo', 'inativo']).optional(),
}).refine((obj) => Object.keys(obj).length > 0, {
  message: 'Nada para atualizar',
});

/**
 * @typedef {import('zod').infer<typeof ClienteCreateSchema>} ClienteCreate
 * @typedef {import('zod').infer<typeof ClienteUpdateSchema>} ClienteUpdate
 */

module.exports = {
  ClienteCreateSchema,
  ClienteUpdateSchema,
};
