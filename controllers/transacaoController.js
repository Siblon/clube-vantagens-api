const supabase = require('../supabaseClient');

const parsePct = (txt) => {
  const m = String(txt || '0').match(/([\d.,]+)/);
  return m ? Number(m[1].replace(',', '.')) : 0;
};

const parseCurrency = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const s = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

exports.criar = async (req, res) => {
  try {
    const { cpf, valor, desconto_aplicado, vencimento } = req.body || {};
    const cpfDigits = String(cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ ok: false, error: 'CPF inválido' });
    }
    const valor_original = parseCurrency(valor);
    if (!Number.isFinite(valor_original) || valor_original <= 0) {
      return res.status(400).json({ ok: false, error: 'Valor inválido' });
    }

    const pct = parsePct(desconto_aplicado || '0%');
    const valor_final = Number((valor_original - valor_original * pct / 100).toFixed(2));
    const payload = {
      cpf: cpfDigits,
      valor_original,
      desconto_aplicado: `${pct}%`,
      valor_final,
      valor_liquido: valor_final,
      status_pagamento: 'pago',
      created_at: new Date().toISOString(),
    };
    if (vencimento) payload.vencimento = vencimento;

    const { data, error } = await supabase.from('transacoes').insert([payload]).select().maybeSingle();
    if (error) throw error;

    return res.status(201).json({ ok: true, transacao: data || payload });
  } catch (err) {
    console.error('POST /transacao failed', { msg: err?.message, code: err?.code });
    return res.status(500).json({ ok: false, error: 'Erro interno ao registrar', requestId: Date.now() });
  }
};
