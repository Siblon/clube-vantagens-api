const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

const descontos = { Essencial: 5, Platinum: 10, Black: 20 };
const descontoPorPlano = (p) => descontos[p] ?? 0;

function parseMoneyToCents(v) {
  if (v == null) return NaN;
  let s = String(v)
    .replace(/[R$\s]/g, '')
    .trim();
  if (!s) return NaN;
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.round(n * 100);
}

exports.preview = async (req, res) => {
  if (!assertSupabase(res)) return;
  const { cpf, id, valor } = req.query;

  const valorCentavos = parseMoneyToCents(valor);
  if ((!cpf && !id)) {
    return res.status(400).json({ ok: false, error: 'IDENTIFICADOR_OBRIGATORIO' });
  }
  if (Number.isNaN(valorCentavos)) {
    return res.status(400).json({ ok: false, error: 'VALOR_INVALIDO' });
  }

  let query;
  if (cpf) {
    const cpfDigits = cpf.replace(/\D/g, '');
    if (cpfDigits.length !== 11) {
      return res.status(400).json({ ok: false, error: 'CPF_INVALIDO' });
    }
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status')
      .eq('cpf', cpfDigits)
      .maybeSingle();
  } else if (id && /^C[0-9]{7}$/i.test(id)) {
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status, id_interno')
      .eq('id_interno', id.toUpperCase())
      .maybeSingle();
  } else {
    return res.status(400).json({ ok: false, error: 'IDENTIFICADOR_INVALIDO' });
  }

  const { data: cliente, error: clienteError } = await query;
  if (clienteError) {
    return res.status(500).json({ ok: false, error: clienteError.message });
  }
  if (!cliente) {
    return res.status(404).json({ ok: false, error: 'Cliente não encontrado' });
  }
  if (cliente.status !== 'ativo') {
    return res.status(400).json({ ok: false, error: 'Assinatura inativa' });
  }

  const desconto = descontoPorPlano(cliente.plano);
  const valorFinalCentavos = Math.round(valorCentavos * (1 - desconto / 100));
  const valorFinal = valorFinalCentavos / 100;

  return res.json({
    nome: cliente.nome,
    plano: cliente.plano,
    descontoAplicado: desconto,
    valorFinal,
    statusPagamento: 'em dia',
    vencimento: '10/09/2025',
  });
};

exports.registrar = async (req, res) => {
  if (!assertSupabase(res)) return;
  const { cpf, valor } = req.body;

  const valorCentavos = parseMoneyToCents(valor);
  if (Number.isNaN(valorCentavos)) {
    return res.status(400).json({ ok: false, error: 'VALOR_INVALIDO' });
  }

  const cpfDigits = (cpf || '').replace(/\D/g, '');
  if (cpfDigits.length !== 11) {
    return res.status(400).json({ ok: false, error: 'CPF_INVALIDO' });
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('cpf, nome, plano, status')
    .eq('cpf', cpfDigits)
    .maybeSingle();
  if (clienteError) {
    return res.status(500).json({ ok: false, error: 'DB_ERROR', detail: clienteError.message });
  }
  if (!cliente) {
    return res.status(404).json({ ok: false, error: 'Cliente não encontrado' });
  }
  if (cliente.status !== 'ativo') {
    return res.status(400).json({ ok: false, error: 'Assinatura inativa' });
  }

  const desconto = descontoPorPlano(cliente.plano);
  const valorFinalCentavos = Math.round(valorCentavos * (1 - desconto / 100));

  const payload = {
    cpf: cliente.cpf,
    cliente_nome: cliente.nome,
    plano: cliente.plano,
    valor_bruto: valorCentavos / 100,
    desconto_aplicado: desconto,
    valor_final: valorFinalCentavos / 100,
    origem: 'caixa',
  };

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('transacoes')
      .insert(payload)
      .select()
      .single();
    if (insertError) throw insertError;

    return res.json({
      ok: true,
      valorCentavos,
      descontoAplicado: desconto,
      valorFinalCentavos,
      transacao: inserted,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ ok: false, error: 'DB_ERROR', detail: error.message });
  }
};

