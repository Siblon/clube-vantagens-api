const { supabase } = require('../../../utils/supabaseClient');

async function create(assinatura) {
  const { data, error } = await supabase
    .from('assinaturas')
    .insert(assinatura)
    .select()
    .single();
  if (error) throw error;
  return data;
}

module.exports = { create };
