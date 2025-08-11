const supabase = require('../supabaseClient');

const descontos = { Essencial: 5, Platinum: 10, Black: 20 };
const descontoPorPlano = (p) => descontos[p] ?? 0;
const valorFinalDe = (v, d) => Number((v * (1 - d / 100)).toFixed(2));

exports.preview = async (req, res) => {
  const { cpf, id, valor } = req.query;
  const valorNum = Number(valor);

  if ((!cpf && !id) || !Number.isFinite(valorNum) || valorNum <= 0) {
    return res
      .status(400)
      .json({ error: 'identificador e valor são obrigatórios e o valor deve ser numérico' });
  }

  let query;
  if (cpf && /^[0-9]{11}$/.test(cpf)) {
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status')
      .eq('cpf', cpf)
      .maybeSingle();
  } else if (id && /^C[0-9]{7}$/i.test(id)) {
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status, id_interno')
      .eq('id_interno', id.toUpperCase())
      .maybeSingle();
  } else {
    return res.status(400).json({ error: 'identificador inválido' });
  }

  const { data: cliente, error: clienteError } = await query;
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
  const { cpf, id, valor } = req.body;
  const valorNum = Number(valor);

  if ((!cpf && !id) || !Number.isFinite(valorNum) || valorNum <= 0) {
    return res
      .status(400)
      .json({ error: 'identificador e valor são obrigatórios e o valor deve ser numérico' });
  }

  let query;
  if (cpf && /^[0-9]{11}$/.test(cpf)) {
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status')
      .eq('cpf', cpf)
      .maybeSingle();
  } else if (id && /^C[0-9]{7}$/i.test(id)) {
    query = supabase
      .from('clientes')
      .select('cpf, nome, plano, status, id_interno')
      .eq('id_interno', id.toUpperCase())
      .maybeSingle();
  } else {
    return res.status(400).json({ error: 'identificador inválido' });
  }

  const { data: cliente, error: clienteError } = await query;
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
    cpf: cliente.cpf,
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
    statusPagamento: 'em dia',
    vencimento: '10/09/2025',
  });
};

