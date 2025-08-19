// src/schemas/admin.js (CommonJS)
const { z } = require('zod');

// Cliente que será inserido na tabela "clientes"
const ClienteCreate = z.object({
  documento: z.string().min(3),
  nome: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

// Payload para criar assinatura/transação admin
const AssinaturaCreate = z.object({
  // pode vir cliente_id OU documento
  cliente_id: z.number().int().positive().optional(),
  documento: z.string().optional(),

  plano: z.string().min(1),
  forma_pagamento: z.string().min(1), // mantenho livre (PIX, crédito, etc.)
  valor: z.number().positive(),

  // opcional; aceitar string ou null
  vencimento: z.string().optional().nullable(),
});

module.exports = { ClienteCreate, AssinaturaCreate };
