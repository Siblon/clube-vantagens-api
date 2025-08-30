const { supabase } = require('../supabaseClient');
const crypto = require('crypto');

function shortId() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

async function generateClientIds() {
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id')
    .is('id_interno', null);
  if (error) throw error;

  let updated = 0;
  for (const cli of clientes || []) {
    for (let i = 0; i < 3; i++) {
      const novoId = shortId();
      const { error: updErr } = await supabase
        .from('clientes')
        .update({ id_interno: novoId })
        .eq('id', cli.id);
      if (!updErr) {
        updated += 1;
        break;
      }
      if (!(updErr?.code === '23505' || /duplicate key value/.test(updErr?.message || ''))) {
        throw updErr;
      }
    }
  }

  return { updated };
}

module.exports = generateClientIds;
