const supabase = require('../supabaseClient');

exports.seed = async (req, res) => {
  const registros = [
    { cpf: '11111111111', nome: 'Cliente Um', plano: 'Essencial', status: 'ativo' },
    { cpf: '22222222222', nome: 'Cliente Dois', plano: 'Platinum', status: 'ativo' },
    { cpf: '33333333333', nome: 'Cliente Três', plano: 'Black', status: 'ativo' }
  ];

  const cpfs = registros.map(r => r.cpf);

  const { data: existentes, error: selectError } = await supabase
    .from('clientes')
    .select('cpf')
    .in('cpf', cpfs);

  if (selectError) {
    return res.status(500).json({ error: selectError.message });
  }

  const { error: upsertError } = await supabase
    .from('clientes')
    .upsert(registros, { onConflict: 'cpf' });

  if (upsertError) {
    return res.status(500).json({ error: upsertError.message });
  }

  const existentesSet = new Set((existentes || []).map(e => e.cpf));
  const inserted = registros.filter(r => !existentesSet.has(r.cpf)).length;
  const updated = registros.length - inserted;

  res.json({ ok: true, inserted, updated });
};
