const supabase = require('../../../services/supabase');

async function findByEmail(email) {
  const { data, error } = await supabase
    .from('clientes')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function create(cliente) {
  const { data, error } = await supabase
    .from('clientes')
    .insert(cliente)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { findByEmail, create };
