const { supabase, assertSupabase } = require('../supabaseClient');
const { toCSV, cell, keepAsText, formatDate } = require('../utils/csv');

exports.list = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    let {
      limit = 50,
      offset = 0,
      action,
      route,
      date_from,
      date_to
    } = req.query || {};
    limit = Math.min(parseInt(limit, 10) || 50, 200);
    offset = parseInt(offset, 10) || 0;
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (action) query = query.eq('action', action);
    if (route) query = query.eq('route', route);
    if (date_from) {
      const from = new Date(`${date_from}T00:00:00`);
      if (!isNaN(from)) query = query.gte('created_at', from.toISOString());
    }
    if (date_to) {
      const to = new Date(`${date_to}T23:59:59`);
      if (!isNaN(to)) query = query.lte('created_at', to.toISOString());
    }
    const { data, count, error } = await query;
    if (error) return next(error);
    return res.json({ rows: data || [], total: count || 0 });
  } catch (err) {
    return next(err);
  }
};

exports.exportAudit = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const exportAll = String(req.query.export_all || '') === '1';
    const limit = exportAll ? 5000 : Math.min(Number(req.query.limit || 500), 5000);

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('created_at,route,action,admin_pin_hash,client_cpf,payload')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const headers = [
      'created_at',
      'rota',
      'acao',
      'admin_pin_hash',
      'cpf',
      'detalhes',
    ];

    const rows = (logs || []).map((r) => [
      cell(formatDate(r.created_at)),
      cell(r.route ?? ''),
      cell(r.action ?? ''),
      cell(r.admin_pin_hash ?? ''),
      keepAsText(r.client_cpf ?? ''),
      cell(r.payload ? JSON.stringify(r.payload) : ''),
    ]);

    const csv = toCSV({ headers, rows });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const fname = `audit-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}-${pad(now.getHours())}${pad(now.getMinutes())}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);

    return res.status(200).send(csv);
  } catch (err) {
    return next(err);
  }
};
