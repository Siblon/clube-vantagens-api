const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');
const { gerarIdInterno, gerarIdUnico } = require('../utils/idGenerator');

function sanitizeCpf(s = '') {
  return (s.match(/\d/g) || []).join('');
}

const PLANOS = new Set(['Essencial', 'Platinum', 'Black']);
const STATUS = new Set(['ativo', 'inativo']);

function parseCliente(raw = {}) {
  const errors = [];
  const cpf = sanitizeCpf(raw.cpf);
  const nome = (raw.nome || '').toString().trim();
  const plano = raw.plano;
  const status = raw.status;
  let pagamento_em_dia = raw.pagamento_em_dia;
  let vencimento = raw.vencimento;

  if (!cpf || cpf.length !== 11) errors.push('cpf inválido');
  if (!nome) errors.push('nome obrigatório');
  if (!PLANOS.has(plano)) errors.push('plano inválido');
  if (!STATUS.has(status)) errors.push('status inválido');

  if (pagamento_em_dia !== undefined) {
    pagamento_em_dia = pagamento_em_dia === true || pagamento_em_dia === 'true' || pagamento_em_dia === 1 || pagamento_em_dia === '1';
  }

  if (vencimento) {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(vencimento)) {
      const [d, m, y] = vencimento.split('/');
      vencimento = `${y}-${m}-${d}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)) {
      errors.push('vencimento inválido');
    }
  }

  return {
    ok: errors.length === 0,
    data: { cpf, nome, plano, status, pagamento_em_dia, vencimento },
    errors
  };
}

exports.list = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const {
      status = '',
      q = '',
      plano = '',
      limit = 50,
      offset = 0
    } = req.query || {};

    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (plano) query = query.eq('plano', plano);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`cpf.ilike.${like},nome.ilike.${like}`);
    }

    const { data, error, count } = await query.order('nome').range(off, off + lim - 1);

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ rows: data || [], total: count || 0 });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.upsertOne = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const v = parseCliente(req.body || {});
    if (!v.ok) return res.status(400).json({ error: v.errors.join('; ') });

    const { data, error } = await supabase
      .from('clientes')
      .upsert(v.data, { onConflict: 'cpf' })
      .select();

    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true, data: data && data[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.bulkUpsert = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const lista = Array.isArray(req.body?.clientes) ? req.body.clientes : [];
    if (lista.length === 0) return res.status(400).json({ error: 'lista vazia' });
    if (lista.length > 200) return res.status(400).json({ error: 'máximo 200 registros por requisição' });

    const seen = new Set();
    const valid = [];
    let invalid = 0;
    let duplicates = 0;

    lista.forEach(raw => {
      const v = parseCliente(raw);
      if (!v.ok) { invalid++; return; }
      if (seen.has(v.data.cpf)) { duplicates++; return; }
      seen.add(v.data.cpf);
      valid.push(v.data);
    });

    if (valid.length === 0) {
      return res.json({ inserted: 0, updated: 0, invalid, duplicates });
    }

    const cpfs = valid.map(v => v.cpf);
    const { data: existentes, error: selErr } = await supabase
      .from('clientes')
      .select('cpf')
      .in('cpf', cpfs);
    if (selErr) return res.status(500).json({ error: selErr.message });

    const existentesSet = new Set((existentes || []).map(e => e.cpf));

    const { error: upErr } = await supabase
      .from('clientes')
      .upsert(valid, { onConflict: 'cpf' });
    if (upErr) return res.status(500).json({ error: upErr.message });

    const updated = valid.filter(v => existentesSet.has(v.cpf)).length;
    const inserted = valid.length - updated;

    return res.json({ inserted, updated, invalid, duplicates });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const cpf = sanitizeCpf(req.params.cpf || '');
    if (!cpf) return res.status(400).json({ error: 'cpf inválido' });

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('cpf', cpf);
    if (error) return res.status(500).json({ error: error.message });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.generateIds = async (req, res) => {
  try {
    if (!assertSupabase(res)) return;
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('cpf')
      .is('id_interno', null);
    if (error) return res.status(500).json({ error: error.message });

    let updated = 0;
    for (const cli of clientes || []) {
      const novo = await gerarIdUnico(supabase);
      const { error: upErr } = await supabase
        .from('clientes')
        .update({ id_interno: novo })
        .eq('cpf', cli.cpf);
      if (!upErr) updated++;
    }
    return res.json({ updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
