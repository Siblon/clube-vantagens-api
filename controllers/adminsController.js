const { supabase, assertSupabase } = require('../supabaseClient');
const { hashPin } = require('../utils/adminPin');

exports.listAdmins = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const { data, error } = await supabase
      .from('admins')
      .select('id,nome,created_at')
      .order('created_at', { ascending: true });
    if (error) return next(error);
    res.json({ ok: true, admins: data || [] });
  } catch (err) {
    next(err);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const nome = (req.body?.nome || '').toString().trim();
    const pin = (req.body?.pin || '').toString();
    if (!nome || !pin) {
      const err = new Error('invalid_params');
      err.status = 400;
      throw err;
    }
    const pin_hash = hashPin(pin);
    const { data, error } = await supabase
      .from('admins')
      .insert({ nome, pin_hash })
      .select('id,nome,created_at')
      .single();
    if (error) {
      if (error.code === '23505') {
        const err = new Error('duplicate_name');
        err.status = 409;
        return next(err);
      }
      return next(error);
    }
    res.status(201).json({ ok: true, admin: data });
  } catch (err) {
    next(err);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    if (!assertSupabase(res)) return;
    const id = parseInt(req.params.id, 10);
    if (!id) {
      const err = new Error('invalid_id');
      err.status = 400;
      throw err;
    }
    const { count, error: countErr } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true });
    if (countErr) return next(countErr);
    if ((count || 0) <= 1) {
      const err = new Error('cannot_remove_last_admin');
      err.status = 400;
      throw err;
    }
    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);
    if (error) return next(error);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

