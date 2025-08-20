// src/schemas/admin.js
const { z } = require('zod');

const ClienteCreate = z.object({
  documento: z.string().min(3),
  nome: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  ativo: z.boolean().optional(),
});

module.exports = { ClienteCreate };
