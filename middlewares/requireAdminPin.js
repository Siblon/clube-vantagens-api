const supabase = require('../services/supabase');

async function requireAdminPin(req, res, next) {
  try {
    const pin = (req.header('x-admin-pin') || '').trim();
    if (!pin) {
      const err = new Error('missing_admin_pin');
      err.status = 401;
      return next(err);
    }

    // Aceitar qualquer admin válido (hash conferido via SQL)
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(pin).digest('hex');

    const { data, error } = await supabase
      .from('admins')
      .select('id,nome')
      .eq('pin_hash', hash)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[requireAdminPin] supabase error', error);
      const err = new Error('db_error');
      err.status = 503;
      return next(err);
    }

    if (!data) {
      const err = new Error('invalid_pin');
      err.status = 401;
      return next(err);
    }

    // segue
    req.admin = { id: data.id, nome: data.nome };
    req.adminId = data.id;
    req.adminNome = data.nome;
    req.adminPinHash = hash;
    next();
  } catch (err) {
    console.error('[requireAdminPin] Supabase error', {
      message: err?.message,
      stack: err?.stack,
      supabase: err,
    });
    const e = new Error('db_error');
    e.status = 503;
    return next(e);
  }
}

module.exports = requireAdminPin;
module.exports.requireAdminPin = requireAdminPin;
