const supabase = require('../supabaseClient');

exports.consultarPorCpf = async (req, res) => {
  const { cpf } = req.query;
  if (!cpf) {
    return res.status(400).json({ error: 'CPF é obrigatório' });
  }
  const { data: cliente, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('cpf', cpf)
    .maybeSingle();
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }
  if (cliente.status !== 'ativo') {
    return res.status(403).json({ error: 'Assinatura inativa' });
  }
  // Retorna apenas as informações necessárias para o caixa
  res.json({
    nome: cliente.nome,
    plano: cliente.plano,
    statusPagamento: 'em dia', // mock
    vencimento: '10/09/2025' // mock
  });
};

exports.listarTodas = async (req, res) => {
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
};
