const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON);

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

router.get('/preview', async (req, res) => {
  try {
    const cpf = (req.query.cpf || '').replace(/\D/g, '');
    const valor = parseValorBRL(String(req.query.valor || '0'));
    if (!cpf || valor <= 0) return res.status(400).json({ ok:false, error:'CPF ou valor inválidos' });

    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) return res.status(404).json({ ok:false, error:'Cliente não encontrado' });

    const { pct, valorFinal } = calcularDesconto(cliente.plano, valor);

    return res.json({
      ok: true,
      cliente: { nome: cliente.nome, plano: cliente.plano },
      descontoPercent: pct,
      valorOriginal: valor,
      valorFinal
    });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'Erro no preview' });
  }
});

router.post('/', express.json(), async (req, res) => {
  try {
    const { cpf: rawCpf, valor: rawValor } = req.body || {};
    const cpf = String(rawCpf || '').replace(/\D/g, '');
    const valor = typeof rawValor === 'number' ? rawValor : parseValorBRL(String(rawValor || '0'));
    if (!cpf || valor <= 0) return res.status(400).json({ ok:false, error:'Dados inválidos' });

    const { data: cliente } = await getClienteByCpf(cpf);
    if (!cliente) return res.status(404).json({ ok:false, error:'Cliente não encontrado' });

    const { pct, valorFinal } = calcularDesconto(cliente.plano, valor);

    const payload = {
      cpf,
      valor_original: valor,
      desconto_aplicado: `${pct}%`,
      valor_final: valorFinal
    };

    const { error, data } = await supabase.from('transacoes').insert(payload).select().maybeSingle();
    if (error) return res.status(500).json({ ok:false, error: 'Falha ao salvar' });

    return res.json({ ok:true, id: data?.id, ...payload });
  } catch (e) {
    return res.status(500).json({ ok:false, error:'Erro ao registrar' });
  }
});

module.exports = router;
