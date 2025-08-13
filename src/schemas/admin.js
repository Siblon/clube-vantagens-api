const { z } = require('zod');

const ClienteCreate = z.object({
  nome: z.string().min(2),
  documento: z.string().min(8),
  telefone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
});

const AssinaturaCreate = z.object({
  cliente_id: z.string().uuid().optional(),
  documento: z.string().min(8).optional(),
  plano: z.enum(['ESSENCIAL', 'PLATINUM', 'BLACK']),
  forma_pagamento: z.enum(['PIX', 'CREDITO', 'DEBITO', 'DINHEIRO', 'BOLETO']),
  valor: z.union([z.string(), z.number()]),
  vencimento: z.string().optional(),
});

module.exports = { ClienteCreate, AssinaturaCreate };
