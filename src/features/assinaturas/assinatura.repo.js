let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../../../config/supabase'));
}

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
