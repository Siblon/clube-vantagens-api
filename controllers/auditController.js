const { supabase, assertSupabase } = require('../supabaseClient');

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

exports.exportCsv = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const {
      action = '',
      route = '',
      date_from = '',
      date_to = '',
      limit = 50,
      offset = 0,
      export_all
    } = req.query || {};
    const lim = Math.min(parseInt(limit, 10) || 50, 200);
    const off = parseInt(offset, 10) || 0;
    let query = supabase
      .from('audit_logs')
      .select(
        'created_at,route,action,admin_pin_hash,client_cpf,payload'
      )
      .order('created_at', { ascending: false });
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
    const exportAll =
      export_all === true ||
      export_all === 'true' ||
      export_all === '1' ||
      export_all === 1;
    if (!exportAll) {
      query = query.range(off, off + lim - 1);
    }
    const { data, error } = await query;
    if (error) return next(error);
    const header =
      'created_at,route,action,admin_pin_hash,client_cpf,payload';
    const lines = (data || []).map(r =>
      [
        r.created_at,
        r.route,
        r.action,
        r.admin_pin_hash,
        r.client_cpf,
        JSON.stringify(r.payload)
      ]
        .map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"')
        .join(',')
    );
    const csv = [header, ...lines].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="audit.csv"'
    );
    return res.send(csv);
  } catch (err) {
    return next(err);
  }
};
