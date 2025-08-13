const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

async function registrarTransacao(req, res) {
  if (!assertSupabase(res)) return;

  const {
    cpf,
    cliente_nome,
    plano,
    valor_original,
    desconto_aplicado,
    valor_final,
    status_pagamento,
    vencimento,
  } = req.body || {};

  const cpfDigits = String(cpf || '').replace(/\D/g, '');
  if (cpfDigits.length !== 11) {
    return res.status(400).json({ ok: false, message: 'CPF inválido' });
  }

  const original = Number(valor_original);
  if (!Number.isFinite(original) || original < 0) {
    return res.status(400).json({ ok: false, message: 'Valor inválido' });
  }

  let descontoStr = desconto_aplicado;
  let finalValue = valor_final;
  if (finalValue == null) {
    let pct = 0;
    if (typeof descontoStr === 'string') {
      pct = Number(descontoStr.replace('%', '').trim());
    } else if (typeof descontoStr === 'number') {
      pct = descontoStr;
      descontoStr = `${pct}%`;
    }
    if (!Number.isFinite(pct)) pct = 0;
    finalValue = Number((original * (1 - pct / 100)).toFixed(2));
  }

  const payload = {
    cpf: cpfDigits,
    cliente_nome,
    plano: plano || null,
    valor_original: original,
    desconto_aplicado: descontoStr || null,
    valor_final: finalValue,
    status_pagamento,
    vencimento: vencimento || null,
  };

  try {
    const { data, error } = await supabase
      .from('transacoes')
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error('[transacao] insert error', error);
      return res.status(500).json({ ok: false, message: 'Erro ao registrar transacao' });
    }
    return res.json({ ok: true, transacao: data });
  } catch (e) {
    console.error('[transacao] unexpected error', e);
    return res.status(500).json({ ok: false, message: 'Erro ao registrar transacao' });
  }
}

module.exports = { registrarTransacao };
