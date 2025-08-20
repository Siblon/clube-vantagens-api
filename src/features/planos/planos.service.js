const supabase = require('../../../supabaseClient.js');

async function list() {
  const { data, error } = await supabase
    .from('planos')
    .select('nome, preco_centavos, ativo, updated_at')
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data || []).map(p => ({
    nome: p.nome,
    preco_centavos: p.preco_centavos,
    precoBRL: Number((p.preco_centavos / 100).toFixed(2)),
    ativo: p.ativo,
    updated_at: p.updated_at,
  }));
}

async function setPreco({ nome, preco_centavos }) {
  const n = Number(preco_centavos);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error('preco_centavos inválido');
    err.status = 400;
    throw err;
  }
  const { data, error } = await supabase
    .from('planos')
    .upsert({ nome, preco_centavos: Math.floor(n), ativo: true, updated_at: new Date().toISOString() })
    .select('nome, preco_centavos, ativo, updated_at')
    .single();
  if (error) throw error;

  return {
    nome: data.nome,
    preco_centavos: data.preco_centavos,
    precoBRL: Number((data.preco_centavos / 100).toFixed(2)),
    ativo: data.ativo,
    updated_at: data.updated_at,
  };
}

module.exports = { list, setPreco };
