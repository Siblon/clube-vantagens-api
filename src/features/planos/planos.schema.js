const { z } = require('zod');

const setPrecoSchema = z.object({
  nome: z.enum(['basico', 'pro', 'premium']),
  // informe UM dos dois:
  preco_centavos: z.number().int().min(0).optional(),
  preco_brl: z.number().min(0).optional(),
}).refine(d => d.preco_centavos != null || d.preco_brl != null, {
  message: 'Informe preco_centavos ou preco_brl',
});

module.exports = { setPrecoSchema };
