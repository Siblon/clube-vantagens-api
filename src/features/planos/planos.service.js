const supabase = require('../../config/supabase.js');

async function getAllPlanos() {
  const { data, error } = await supabase.from('planos').select('*');
  if (error) throw error;
  return { data, error };
}

async function getPlanoById(id) {
  const { data, error } = await supabase
    .from('planos')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return { data, error };
}

async function createPlano(payload) {
  const { data, error } = await supabase
    .from('planos')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return { data, error };
}

async function updatePlano(id, payload) {
  const { data, error } = await supabase
    .from('planos')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { data, error };
}

async function deletePlano(id) {
  const { data, error } = await supabase
    .from('planos')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { data, error };
}

module.exports = {
  getAllPlanos,
  getPlanoById,
  createPlano,
  updatePlano,
  deletePlano,
};
