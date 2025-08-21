/* src/features/planos/planos.service.js */
let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../../../config/supabase'));
}

async function getAllPlanos() {
  const { data, error } = await supabase.from('planos').select('*');
  if (error) throw error;
  return { data, error: null };
}

async function getPlanoById(id) {
  const { data, error } = await supabase.from('planos').select('*').eq('id', id);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error: null };
}

async function createPlano(payload) {
  const arrayPayload = Array.isArray(payload) ? payload : [payload];
  const { data, error } = await supabase.from('planos').insert(arrayPayload);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? { id: 1, ...payload }, error: null };
}

async function updatePlano(id, payload) {
  const { data, error } = await supabase.from('planos').update(payload).eq('id', id);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? { id, ...payload }, error: null };
}

async function deletePlano(id) {
  const { data, error } = await supabase.from('planos').delete().eq('id', id);
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error: null };
}

module.exports = {
  getAllPlanos,
  getPlanoById,
  createPlano,
  updatePlano,
  deletePlano,
};
