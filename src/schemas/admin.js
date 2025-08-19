// src/schemas/admin.js
const { z } = require('zod');

const ClienteCreate = z.object({
  documento: z.string().min(3),
  nome: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

const AssinaturaCreate = z.object({
  cliente_id: z.number().int().positive().optional(),
  documento: z.string().min(1).optional(),
  email: z.string().email().optional(),
  plano: z.string().min(1),
  forma_pagamento: z.string().min(1).optional(),
  vencimento: z.string().optional(),
});

module.exports = { ClienteCreate, AssinaturaCreate };
