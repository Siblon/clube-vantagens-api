const supabase = require('../../../services/supabase');

const TABLE = 'clientes';

async function list({ q, limit = 50, offset = 0 }) {
  let query = supabase.from(TABLE).select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    // Fazer ilike em múltiplos campos usando or()
    query = query.or(`nome.ilike.${term},email.ilike.${term},cpf.ilike.${term},telefone.ilike.${term}`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message || 'Erro ao listar clientes');
  return { rows: data, count: count ?? data?.length ?? 0 };
}

async function getById(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
  if (error) throw new Error(error.message || 'Cliente não encontrado');
  return data;
}

async function create(payload) {
  const { data, error } = await supabase.from(TABLE).insert(payload).select('*').single();
  if (error) throw new Error(error.message || 'Erro ao criar cliente');
  return data;
}

async function update(id, payload) {
  const { data, error } = await supabase.from(TABLE).update(payload).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message || 'Erro ao atualizar cliente');
  if (!data) throw new Error('Cliente não encontrado para atualizar');
  return data;
}

async function remove(id) {
  const { error, count } = await supabase.from(TABLE).delete({ count: 'exact' }).eq('id', id);
  if (error) throw new Error(error.message || 'Erro ao remover cliente');
  return { deleted: (count ?? 0) > 0 };
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
