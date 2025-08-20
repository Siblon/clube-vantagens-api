// src/features/assinaturas/assinatura.repo.js
const supabase = require('../../../supabaseClient.js');

function table() {
  return supabase.from('assinaturas');
}

/**
 * Cria uma assinatura com valor em centavos.
 * Retorna { id, cliente_id, plano, valor }.
 */
async function create({ cliente_id, plano, valor }) {
  if (!Number.isFinite(valor)) {
    const err = new Error('valor inválido');
    err.status = 400;
    throw err;
  }
  const { data, error } = await table()
    .insert({ cliente_id, plano, valor })
    .select('id, cliente_id, plano, valor')
    .single();
  if (error) throw error;
  return data;
}

module.exports = { create };
