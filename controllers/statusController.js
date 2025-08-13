const supabase = require('../supabaseClient');
const { assertSupabase } = supabase;

exports.info = async (req, res) => {
  res.json({
    ok: true,
    version: 'v0.1.0',
    env: process.env.NODE_ENV || 'unknown',
    time: new Date().toISOString()
  });
};

exports.pingSupabase = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  try {
    const { data, error, count } = await supabase
      .from('clientes')
      .select('cpf', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;
    res.json({ ok: true, count: count ?? null });
  } catch (err) {
    next(err);
  }
};
