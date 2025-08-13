const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

exports.consultarPorIdentificador = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { cpf, id } = req.query;
  let query;
  if (cpf && /^[0-9]{11}$/.test(cpf)) {
    query = supabase.from('clientes').select('*').eq('cpf', cpf).maybeSingle();
  } else if (id && /^C[0-9]{7}$/i.test(id)) {
    query = supabase.from('clientes').select('*').eq('id_interno', id.toUpperCase()).maybeSingle();
  } else {
    const err = new Error('CPF ou ID inválido');
    err.status = 400;
    return next(err);
  }
  const { data: cliente, error } = await query;
  if (error) return next(error);
  if (!cliente) {
    const err = new Error('Cliente não encontrado');
    err.status = 404;
    return next(err);
  }
  if (cliente.status !== 'ativo') {
    const err = new Error('Assinatura inativa');
    err.status = 403;
    return next(err);
  }
  // Retorna apenas as informações necessárias para o caixa
  res.json({
    nome: cliente.nome,
    plano: cliente.plano,
    statusPagamento: 'em dia', // mock
    vencimento: '10/09/2025' // mock
  });
};

exports.listarTodas = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { data, error } = await supabase.from('clientes').select('*');
  if (error) return next(error);
  res.json(data);
};
