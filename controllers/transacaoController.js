const supabase = require('../supabaseClient');

function descontoPorPlano(plano) {
  return ({ Essencial: 5, Platinum: 10, Black: 20 })[plano] ?? 0;
}

function valorFinalDe(valor, desconto) {
  return Number((valor * (1 - desconto / 100)).toFixed(2));
}

exports.preview = async (req, res) => {
  const { cpf, valor } = req.query;
  const valorNum = Number(valor);

  if (!/^[0-9]{11}$/.test(cpf) || !Number.isFinite(valorNum) || valorNum <= 0) {
    return res
      .status(400)
      .json({ error: 'CPF e valor são obrigatórios e o valor deve ser numérico' });
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('cpf, nome, plano, status')
    .eq('cpf', cpf)
    .maybeSingle();
  if (clienteError) {
    return res.status(500).json({ error: clienteError.message });
  }
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  if (cliente.status !== 'ativo') {
    return res.status(400).json({ error: 'Assinatura inativa' });
  }

  const descontoAplicado = descontoPorPlano(cliente.plano);
  const valorFinal = valorFinalDe(valorNum, descontoAplicado);

  return res.json({
    nome: cliente.nome,
    plano: cliente.plano,
    descontoAplicado,
    valorFinal,
    statusPagamento: 'em dia',
    vencimento: '10/09/2025',
  });
};

exports.registrar = async (req, res) => {
  const { cpf, valor } = req.body;
  const valorNum = Number(valor);

  if (!/^[0-9]{11}$/.test(cpf) || !Number.isFinite(valorNum) || valorNum <= 0) {
    return res
      .status(400)
      .json({ error: 'CPF e valor são obrigatórios e o valor deve ser numérico' });
  }

  const { data: cliente, error: clienteError } = await supabase
    .from('clientes')
    .select('cpf, nome, plano, status')
    .eq('cpf', cpf)
    .maybeSingle();
  if (clienteError) {
    return res.status(500).json({ error: clienteError.message });
  }
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  if (cliente.status !== 'ativo') {
    return res.status(400).json({ error: 'Assinatura inativa' });
  }

  const desconto = descontoPorPlano(cliente.plano);
  const valorFinal = valorFinalDe(valorNum, desconto);

  const payload = {
    cpf,
    cliente_nome: cliente.nome,
    plano: cliente.plano,
    valor_bruto: valorNum,
    desconto_aplicado: desconto,
    valor_final: valorFinal,
    origem: 'caixa',
  };

  const { data: inserted, error: insertError } = await supabase
    .from('transacoes')
    .insert(payload)
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  return res.json({
    id: inserted.id,
    created_at: inserted.created_at,
    nome: cliente.nome,
    plano: cliente.plano,
    descontoAplicado: desconto,
    valorFinal,
    statusPagamento: 'em dia', // TODO: integrar real
    vencimento: '10/09/2025', // TODO: integrar real
  });
};

