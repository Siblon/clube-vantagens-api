const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

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
  if (!assertSupabase(res)) return;
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
    if (!assertSupabase(res)) return;
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

function gerarIdInterno() {
  const digits = '23456789';
  let out = 'C';
  for (let i = 0; i < 7; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

async function gerarIdUnico() {
  while (true) {
    const id = gerarIdInterno();
    const { data, error } = await supabase
      .from('clientes')
      .select('id')
      .eq('id_interno', id)
      .maybeSingle();
    if (!error && !data) return id;
  }
}

exports.generateIds = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id')
      .is('id_interno', null);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    let updated = 0;
    for (const cli of clientes || []) {
      const novoId = await gerarIdUnico();
      const { error: updErr } = await supabase
        .from('clientes')
        .update({ id_interno: novoId })
        .eq('id', cli.id);
      if (!updErr) updated += 1;
    }

    res.json({ updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
