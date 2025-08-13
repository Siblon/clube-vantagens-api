const supabase = require('../supabaseClient');
const { planos } = require('../models/data');

const parseCurrency = (str) => {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  const s = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

exports.preview = async (req, res) => {
  try {
    const { cpf, valor } = req.query || {};
    const cpfDigits = String(cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ ok: false, error: 'CPF inválido' });
    }
    const valor_original = parseCurrency(valor);
    if (!Number.isFinite(valor_original) || valor_original <= 0) {
      return res.status(400).json({ ok: false, error: 'Valor inválido' });
    }
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('nome, plano')
      .eq('cpf', cpfDigits)
      .maybeSingle();
    if (error) throw error;
    if (!cliente) return res.status(404).json({ ok: false, error: 'Cliente não encontrado' });

    const descontoPercent = planos[cliente.plano]?.descontoLoja || 0;
    const valorFinal = Number((valor_original - valor_original * descontoPercent / 100).toFixed(2));

    return res.json({ ok: true, cliente: { nome: cliente.nome, plano: cliente.plano }, descontoPercent, valorFinal });
  } catch (err) {
    console.error('GET /transacao/preview failed', { msg: err?.message, code: err?.code });
    return res.status(500).json({ ok: false, error: 'Erro interno ao simular', requestId: Date.now() });
  }
};

exports.criar = async (req, res) => {
  try {
    const { cpf, valor } = req.body || {};
    const cpfDigits = String(cpf || '').replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ ok: false, error: 'CPF inválido' });
    }
    const valor_original = parseCurrency(valor);
    if (!Number.isFinite(valor_original) || valor_original <= 0) {
      return res.status(400).json({ ok: false, error: 'Valor inválido' });
    }
    const { data: cliente, error } = await supabase
      .from('clientes')
      .select('plano')
      .eq('cpf', cpfDigits)
      .maybeSingle();
    if (error) throw error;
    if (!cliente) return res.status(404).json({ ok: false, error: 'Cliente não encontrado' });

    const descontoPercent = planos[cliente.plano]?.descontoLoja || 0;
    const valor_final = Number((valor_original - valor_original * descontoPercent / 100).toFixed(2));
    const payload = {
      cpf: cpfDigits,
      valor_original,
      desconto_aplicado: `${descontoPercent}%`,
      valor_final,
    };

    const { data, error: insErr } = await supabase.from('transacoes').insert(payload).select('id').maybeSingle();
    if (insErr) throw insErr;
    return res.status(201).json({ ok: true, id: data?.id });
  } catch (err) {
    console.error('POST /transacao failed', { msg: err?.message, code: err?.code });
    return res.status(500).json({ ok: false, error: 'Erro interno ao registrar', requestId: Date.now() });
  }
};
