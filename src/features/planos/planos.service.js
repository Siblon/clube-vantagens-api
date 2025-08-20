const supabase = require('../../config/supabase');

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

async function createPlano(data) {
  const { data: result, error } = await supabase
    .from('planos')
    .insert([data])
    .select()
    .single();
  if (error) throw error;
  return { data: result, error };
}

async function updatePlano(id, data) {
  const { data: result, error } = await supabase
    .from('planos')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { data: result, error };
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
