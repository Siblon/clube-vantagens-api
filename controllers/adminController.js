const supabase = require('../supabaseClient');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}
const PLANOS = new Set(['Essencial', 'Platinum', 'Black']);
const STATUS = new Set(['ativo', 'inativo']);

function validateCliente(raw) {
  const errors = [];
  const cpf = sanitizeCpf(raw?.cpf);
  const nome = (raw?.nome || '').toString().trim();
  const plano = raw?.plano;
  const status = raw?.status;

  if (!cpf || cpf.length !== 11) errors.push('cpf inválido');
  if (!nome) errors.push('nome obrigatório');
  if (!PLANOS.has(plano)) errors.push('plano inválido (Essencial|Platinum|Black)');
  if (!STATUS.has(status)) errors.push('status inválido (ativo|inativo)');

  return { ok: errors.length === 0, errors, data: { cpf, nome, plano, status } };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

exports.bulkClientes = async (req, res) => {
  try {
    const lista = Array.isArray(req.body?.clientes) ? req.body.clientes : null;
    if (!lista) {
      return res.status(400).json({ error: 'corpo inválido: informe { clientes: [...] }' });
    }

    const validos = [];
    const invalid = [];

    lista.forEach((item, idx) => {
      const v = validateCliente(item);
      if (v.ok) {
        validos.push({ ...v.data, _index: idx });
      } else {
        invalid.push({ index: idx, cpf: sanitizeCpf(item?.cpf || ''), errors: v.errors });
      }
    });

    let inserted = 0;
    let updated = 0;

    const batches = chunk(validos, 100);
    for (const batch of batches) {
      const payload = batch.map(({ _index, ...rest }) => rest);
      const cpfsBatch = payload.map(b => b.cpf);

      const { data: existentes, error: selectError } = await supabase
        .from('clientes')
        .select('cpf')
        .in('cpf', cpfsBatch);

      if (selectError) {
        batch.forEach(b => invalid.push({ index: b._index, cpf: b.cpf, errors: ['erro no banco: ' + selectError.message] }));
        continue;
      }

      const existentesSet = new Set((existentes || []).map(e => e.cpf));

      const { data, error } = await supabase
        .from('clientes')
        .upsert(payload, { onConflict: 'cpf' })
        .select();

      if (error) {
        batch.forEach(b => invalid.push({ index: b._index, cpf: b.cpf, errors: ['erro no banco: ' + error.message] }));
        continue;
      }

      data.forEach(row => {
        if (existentesSet.has(row.cpf)) updated += 1;
        else inserted += 1;
      });
    }

    return res.json({ ok: true, inserted, updated, invalid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
