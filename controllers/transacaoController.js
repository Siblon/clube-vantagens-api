const supabase = require('../supabaseClient');

const descontos = {
  Essencial: 5,
  Platinum: 10,
  Black: 20
};

exports.registrar = async (req, res) => {
  const { cpf, valor } = req.body;

  if (!cpf || typeof valor !== 'number' || isNaN(valor)) {
    return res.status(400).json({ error: 'CPF e valor são obrigatórios e o valor deve ser numérico' });
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
    return res.status(403).json({ error: 'Assinatura inativa' });
  }

  // Mock de status de pagamento e vencimento
  const statusPagamento = 'em dia'; // TODO: integrar com dados reais do Supabase
  const vencimento = '10/09/2025'; // TODO: integrar com dados reais do Supabase

  const descontoPercentual = descontos[cliente.plano] || 0;
  const valorDesconto = (valor * descontoPercentual) / 100;
  const valorFinal = valor - valorDesconto;

  const { error: insertError } = await supabase.from('transacoes').insert({
    cpf,
    valor_original: valor,
    desconto_aplicado: `${descontoPercentual}%`,
    valor_final: valorFinal
  });
  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  res.json({
    nome: cliente.nome,
    cpf,
    plano: cliente.plano,
    valorOriginal: valor,
    descontoAplicado: `${descontoPercentual}%`,
    valorFinal,
    statusPagamento,
    vencimento
  });
};
