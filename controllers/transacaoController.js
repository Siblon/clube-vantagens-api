const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { z } = require('zod');

function parseValor(str) {
  if (typeof str !== 'string') return 0;
  const normalized = str.includes(',') ? str.replace(/\./g, '').replace(',', '.') : str;
  const n = Number(normalized);
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

const schema = z.object({
  cpf: z
    .string({ required_error: 'CPF é obrigatório' })
    .transform((v) => v.replace(/\D/g, ''))
    .refine((v) => /^\d{11}$/.test(v), { message: 'CPF inválido' }),
  valor: z
    .preprocess(
      (v) => (typeof v === 'string' ? parseValor(v) : v),
      z
        .number({ required_error: 'Valor é obrigatório' })
        .positive('Valor inválido')
    ),
});

async function getClienteByCpf(cpf) {
  return await supabase.from('clientes').select('*').eq('cpf', cpf).maybeSingle();
}

async function getDescontoPercentByPlano(nomePlano){
  const { data, error } = await supabase.from('planos')
    .select('desconto_percent')
    .eq('nome', nomePlano)
    .eq('ativo', true)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.desconto_percent || 0);
}
function round2(n){ return Math.round((Number(n)||0)*100)/100; }

router.get('/preview', async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const err = new Error(parsed.error.issues[0].message);
      err.status = 400;
      return next(err);
    }
    const { cpf, valor } = parsed.data;

    
    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) {
      const err = new Error('Cliente não encontrado');
      err.status = 404;
      return next(err);
    }

      const desconto = await getDescontoPercentByPlano(cliente.plano);
      const valorFinal = round2(valor * (1 - desconto / 100));

      return res.json({
        ok: true,
        cliente: {
          nome: cliente.nome,
          plano: cliente.plano,
          statusPagamento: cliente.status_pagamento,
          vencimento: cliente.vencimento,
        },
        descontoPercent: desconto,
        valorOriginal: valor,
        valorFinal,
      });
  } catch (e) {
    const err = new Error('Erro no preview');
    err.status = 500;
    return next(err);
  }
});

router.post('/', express.json(), async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const err = new Error(parsed.error.issues[0].message);
      err.status = 400;
      return next(err);
    }
    const { cpf, valor } = parsed.data;

    
    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) {
      const err = new Error('Cliente não encontrado');
      err.status = 404;
      return next(err);
    }

      const desconto = await getDescontoPercentByPlano(cliente.plano);
      const valorFinal = round2(valor * (1 - desconto / 100));

      const payload = {
        cpf,
        valor_original: valor,
        desconto_aplicado: desconto,
        valor_final: valorFinal,
      };

      const { error, data } = await supabase.from('transacoes').insert(payload).select().maybeSingle();
      if (error) return next(error);

      return res.json({
        ok: true,
        id: data?.id,
        cpf,
        valor_original: valor,
        desconto_aplicado: `${desconto}%`,
        valor_final: valorFinal,
      });
  } catch (e) {
    const err = new Error('Erro ao registrar');
    err.status = 500;
    return next(err);
  }
});

module.exports = router;
