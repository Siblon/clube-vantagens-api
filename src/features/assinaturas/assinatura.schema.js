import { z } from 'zod';

export const assinaturaSchema = z.object({
  email: z.string().email('email inválido'),
  plano: z.enum(['basico', 'pro', 'premium']),
  valor: z.union([z.string(), z.number()]).optional(),
});

export default assinaturaSchema;
