const { z } = require('zod');
const assinaturaSchema = z.object({
  cliente_id: z.number().int().positive().optional(),
  email: z.string().email().optional(),
  documento: z.string().min(5).optional(),
  plano: z.enum(['basico', 'pro', 'premium']),
}).refine((d) => !!(d.cliente_id || d.email || d.documento), {
  message: 'Informe cliente_id, email ou documento'
});
module.exports = { assinaturaSchema };
