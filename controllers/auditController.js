const { supabase, assertSupabase } = require('../supabaseClient');

exports.list = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    let { limit = 50, offset = 0, action, route } = req.query || {};
    limit = Math.min(parseInt(limit, 10) || 50, 200);
    offset = parseInt(offset, 10) || 0;
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (action) query = query.eq('action', action);
    if (route) query = query.eq('route', route);
    const { data, count, error } = await query;
    if (error) return next(error);
    return res.json({ rows: data || [], total: count || 0 });
  } catch (err) {
    return next(err);
  }
};
