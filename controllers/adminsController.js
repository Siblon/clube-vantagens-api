const { assertSupabase } = require('../supabaseClient');
const { hashPin } = require('../utils/adminPin');

exports.listAdmins = async (req, res, next) => {
  try {
    const supabase = assertSupabase(res);
    if (!supabase) return;

    const { data, error } = await supabase
      .from('admins')
      .select('id,nome,created_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[admins.list] db error', error);
      const err = new Error('db_error'); err.status = 500; return next(err);
    }

    res.json({ ok:true, admins: data || [] });
  } catch (err) {
    console.error('[admins.list] unexpected', err);
    err.status = err.status || 500;
    next(err);
  }
};

exports.createAdmin = async (req, res, next) => {
  try {
    const supabase = assertSupabase(res);
    if (!supabase) return;

    const nome = String((req.body?.nome || '')).trim();
    const pin  = String((req.body?.pin  || '')).trim();
    if (!nome || !pin) {
      const err = new Error('invalid_params'); err.status = 400; return next(err);
    }

    const pin_hash = hashPin(pin);

    // impede nomes duplicados
    const { data: exists, error: e1 } = await supabase
      .from('admins')
      .select('id').eq('nome', nome).maybeSingle();

    if (e1) { console.error('[admins.create] find error', e1); const err = new Error('db_error'); err.status=500; return next(err); }
    if (exists) { const err = new Error('admin_name_taken'); err.status=409; return next(err); }

    const { data, error } = await supabase
      .from('admins')
      .insert([{ nome, pin_hash }])
      .select('id,nome,created_at')
      .maybeSingle();

    if (error) {
      console.error('[admins.create] insert error', error);
      const err = new Error('db_error'); err.status=500; return next(err);
    }

    res.status(201).json({ ok:true, admin: data });
  } catch (err) {
    console.error('[admins.create] unexpected', err);
    err.status = err.status || 500;
    next(err);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  try {
    const supabase = assertSupabase(res);
    if (!supabase) return;

    const id = parseInt(req.params.id, 10);
    if (!id) {
      const err = new Error('invalid_id'); err.status = 400; return next(err);
    }

    const { count, error: countErr } = await supabase
      .from('admins')
      .select('id', { count: 'exact', head: true });

    if (countErr) {
      console.error('[admins.delete] count error', countErr);
      const err = new Error('db_error'); err.status = 500; return next(err);
    }

    if ((count || 0) <= 1) {
      const err = new Error('cannot_remove_last_admin'); err.status = 400; return next(err);
    }

    const { error } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[admins.delete] delete error', error);
      const err = new Error('db_error'); err.status = 500; return next(err);
    }

    res.json({ ok:true });
  } catch (err) {
    console.error('[admins.delete] unexpected', err);
    err.status = err.status || 500;
    next(err);
  }
};
