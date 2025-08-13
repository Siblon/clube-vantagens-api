const supabase = require('../supabaseClient');
const { gerarIdUnico } = require('./idGenerator');

async function generateClientIds() {
  const { data: clientes, error } = await supabase
    .from('clientes')
    .select('id')
    .is('id_interno', null);
  if (error) throw error;

  let updated = 0;
  for (const cli of clientes || []) {
    const novoId = await gerarIdUnico(supabase);
    const { error: updErr } = await supabase
      .from('clientes')
      .update({ id_interno: novoId })
      .eq('id', cli.id);
    if (!updErr) updated += 1;
  }

  return updated;
}

module.exports = generateClientIds;
