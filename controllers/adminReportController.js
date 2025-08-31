const { supabase, assertSupabase } = require('../supabaseClient');
const { toCSV, cell, keepAsText, formatDate } = require('../utils/csv');

exports.summary = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    let q = supabase
      .from('clientes')
      .select('status,plano,metodo_pagamento', { count: 'exact' });

    const { status, plano, metodo, from, to } = req.query || {};
    if (status) q = q.eq('status', status);
    if (plano) q = q.eq('plano', plano);
    if (metodo) q = q.eq('metodo_pagamento', metodo);
    if (from) q = q.gte('created_at', new Date(from + 'T00:00:00').toISOString());
    if (to) q = q.lte('created_at', new Date(to + 'T23:59:59').toISOString());

    const { data, count, error } = await q;
    if (error) throw error;

    const total = count || 0;
    let ativos = 0;
    let inativos = 0;
    const porPlano = {};
    const porMetodo = {};

    (data || []).forEach((row) => {
      if (row.status === 'ativo') ativos++;
      else if (row.status === 'inativo') inativos++;

      if (row.plano) porPlano[row.plano] = (porPlano[row.plano] || 0) + 1;
      if (row.metodo_pagamento)
        porMetodo[row.metodo_pagamento] =
          (porMetodo[row.metodo_pagamento] || 0) + 1;
    });

    return res.json({ total, ativos, inativos, porPlano, porMetodo });
  } catch (err) {
    return next(err);
  }
};

exports.csv = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    let q = supabase
      .from('clientes')
      .select(
        'cpf,nome,email,telefone,plano,status,metodo_pagamento,created_at'
      )
      .order('created_at', { ascending: true });

    const { status, plano, metodo, from, to } = req.query || {};
    if (status) q = q.eq('status', status);
    if (plano) q = q.eq('plano', plano);
    if (metodo) q = q.eq('metodo_pagamento', metodo);
    if (from) q = q.gte('created_at', new Date(from + 'T00:00:00').toISOString());
    if (to) q = q.lte('created_at', new Date(to + 'T23:59:59').toISOString());

    const { data, error } = await q;
    if (error) throw error;

    const headers = [
      'cpf',
      'nome',
      'email',
      'telefone',
      'plano',
      'status',
      'metodo_pagamento',
      'created_at',
    ];

    const rows = (data || []).map((c) => [
      keepAsText(c.cpf ?? ''),
      cell(c.nome ?? ''),
      cell(c.email ?? ''),
      keepAsText(c.telefone ?? ''),
      cell(c.plano ?? ''),
      cell(c.status ?? ''),
      cell(c.metodo_pagamento ?? ''),
      cell(formatDate(c.created_at)),
    ]);

    const csv = toCSV({ headers, rows });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `clientes-report-${now.getFullYear()}${pad(
      now.getMonth() + 1
    )}${pad(now.getDate())}-${pad(now.getHours())}${pad(
      now.getMinutes()
    )}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  summary: exports.summary,
  csv: exports.csv,
};
