const { randomUUID } = require('crypto');
const supabase = require('../services/supabase');

/**
 * Percorre a tabela "clientes" e preenche o campo "id_interno" onde estiver nulo.
 * A operação é feita em lotes para evitar consumo excessivo de memória.
 *
 * @param {number} [batchSize=500] Quantidade de registros processados por requisição.
 * @returns {Promise<{scanned:number, updated:number}>} Estatísticas da execução.
 */
module.exports = async function generateClientIds(batchSize = 500) {
  let scanned = 0;
  let updated = 0;
  let page = 0;

  for (;;) {
    const from = page * batchSize;
    const to = from + batchSize - 1;

    const { data, error } = await supabase
      .from('clientes')
      .select('id,id_interno')
      .is('id_interno', null)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    scanned += data.length;

    const patch = data.map(row => ({
      id: row.id,
      id_interno: randomUUID(),
    }));

    const { error: upErr } = await supabase
      .from('clientes')
      .upsert(patch, { onConflict: 'id' });

    if (upErr) throw upErr;

    updated += patch.length;
    page += 1;
  }

  return { scanned, updated };
};
