const supabase = require('../services/supabase');
const { toCSV, cell, keepAsText, formatDate } = require('../utils/csv');

exports.summary = async (req, res, next) => {
  try {
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
        const exportAll = String(req.query.export_all || '') === '1';
    const limit = exportAll ? 5000 : Math.min(Number(req.query.limit || 500), 5000);

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('created_at,route,action,admin_pin_hash,admin_id,admin_nome,client_cpf,payload')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;

    const headers = [
      'created_at',
      'rota',
      'action',
      'admin_pin_hash',
      'admin_id',
      'admin_nome',
      'client_cpf',
      'payload',
    ];

    const rows = (logs || []).map((r) => [
      cell(formatDate(r.created_at)),
      cell(r.route ?? ''),
      cell(r.action ?? ''),
      cell(r.admin_pin_hash ?? ''),
      keepAsText(r.admin_id ?? ''),
      cell(r.admin_nome ?? ''),
      keepAsText(r.client_cpf ?? ''),
      cell(r.payload ? JSON.stringify(r.payload) : ''),
    ]);

    const csv = toCSV({ headers, rows });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    const today = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="relatorio-${today}.csv"`);

    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  summary: exports.summary,
  csv: exports.csv,
};
