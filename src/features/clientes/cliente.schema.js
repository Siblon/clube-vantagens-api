import { z } from 'zod';

// Schema for cliente creation
export const clienteSchema = z.object({
  nome: z.string().min(1, 'nome obrigatório'),
  email: z.string().email('email inválido'),
  telefone: z
    .string()
    .min(1, 'telefone obrigatório')
    .transform((val) => val.replace(/\D/g, '')),
});

export default clienteSchema;
