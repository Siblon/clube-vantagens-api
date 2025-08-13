const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');
const { assertSupabase } = supabase;

function parseValorBRL(str) {
  if (typeof str !== 'string') return 0;
  return Number(str.replace(/\./g, '').replace(',', '.')) || 0;
}

async function getClienteByCpf(cpf) {
  return await supabase.from('clientes').select('*').eq('cpf', cpf).maybeSingle();
}

function calcularDesconto(plano, valor) {
  // regra simples: Essencial 5%, Premium 10%, Platinum 10% (ajuste se quiser)
  const mapa = { Essencial: 5, Premium: 10, Platinum: 10 };
  const pct = mapa[plano] || 0;
  const valorFinal = Number((valor * (1 - pct/100)).toFixed(2));
  return { pct, valorFinal };
}

router.get('/preview', async (req, res, next) => {
  try {
    const cpf = (req.query.cpf || '').replace(/\D/g, '');
    const valor = parseValorBRL(String(req.query.valor || '0'));
    if (!cpf || valor <= 0) {
      const err = new Error('CPF ou valor inválidos');
      err.status = 400;
      return next(err);
    }

    if (!assertSupabase(res)) return;

    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) {
      const err = new Error('Cliente não encontrado');
      err.status = 404;
      return next(err);
    }

    const { pct, valorFinal } = calcularDesconto(cliente.plano, valor);

    return res.json({
      ok: true,
      cliente: { nome: cliente.nome, plano: cliente.plano },
      descontoPercent: pct,
      valorOriginal: valor,
      valorFinal
    });
  } catch (e) {
    const err = new Error('Erro no preview');
    err.status = 500;
    return next(err);
  }
});

router.post('/', express.json(), async (req, res, next) => {
  try {
    const { cpf: rawCpf, valor: rawValor } = req.body || {};
    const cpf = String(rawCpf || '').replace(/\D/g, '');
    const valor = typeof rawValor === 'number' ? rawValor : parseValorBRL(String(rawValor || '0'));
    if (!cpf || valor <= 0) {
      const err = new Error('Dados inválidos');
      err.status = 400;
      return next(err);
    }

    if (!assertSupabase(res)) return;

    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) {
      const err = new Error('Cliente não encontrado');
      err.status = 404;
      return next(err);
    }

    const { pct, valorFinal } = calcularDesconto(cliente.plano, valor);

    const payload = {
      cpf,
      valor_original: valor,
      desconto_aplicado: `${pct}%`,
      valor_final: valorFinal
    };

    const { error, data } = await supabase.from('transacoes').insert(payload).select().maybeSingle();
    if (error) return next(error);

    return res.json({ ok:true, id: data?.id, ...payload });
  } catch (e) {
    const err = new Error('Erro ao registrar');
    err.status = 500;
    return next(err);
  }
});

module.exports = router;
