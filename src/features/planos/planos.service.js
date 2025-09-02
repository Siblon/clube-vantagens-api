/* src/features/planos/planos.service.js */
const supabase = require('../../../services/supabase');

async function getAll() {
  const { data, error } = await supabase.from('planos').select('*');
  if (error) throw error;
  return { data, error: null };
}

async function create(payload) {
  const arrayPayload = Array.isArray(payload) ? payload : [payload];
  const { data, error } = await supabase.from('planos').insert(arrayPayload);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const id = row?.id ?? 1;
  return { data: { id }, error: null };
}

async function update(id, payload) {
  const { data, error } = await supabase.from('planos').update(payload).eq('id', id);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? { id, ...payload }, error: null };
}

async function remove(id) {
  const { data, error } = await supabase.from('planos').delete().eq('id', id);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error: null };
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
