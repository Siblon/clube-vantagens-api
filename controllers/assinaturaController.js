const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

exports.consultarPorIdentificador = async (req, res) => {
  if (!assertSupabase(res)) return;
  const { cpf, id } = req.query;
  let query;
  if (cpf && /^[0-9]{11}$/.test(cpf)) {
    query = supabase.from('clientes').select('*').eq('cpf', cpf).maybeSingle();
  } else if (id && /^C[0-9]{7}$/i.test(id)) {
    query = supabase.from('clientes').select('*').eq('id_interno', id.toUpperCase()).maybeSingle();
  } else {
    return res.status(400).json({ error: 'CPF ou ID inválido' });
  }
  const { data: cliente, error } = await query;
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
  if (!assertSupabase(res)) return;
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
};
