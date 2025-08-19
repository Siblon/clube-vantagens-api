const { z } = require('zod');

const assinaturaSchema = z.object({
  email: z.string().email('email inválido'),
  plano: z.enum(['basico', 'pro', 'premium']),
  valor: z.union([z.string(), z.number()]).optional(),
});

module.exports = { assinaturaSchema };
