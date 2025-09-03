const supabase = require('../services/supabase');

async function requireAdminPin(req, res, next) {
  try {
    const pin = (req.header('x-admin-pin') || '').trim();
    if (!pin) {
      return res.status(401).json({ ok:false, error:'missing_admin_pin' });
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
      return res.status(503).json({ ok:false, error:'db_error', details: error.message || error });
    }

    if (!data) {
      console.warn('[PIN_INVALID]', {
        route: req.originalUrl,
        ip: req.ip,
        timestamp: new Date().toISOString(),
      });
      return res.status(401).json({ ok:false, error:'invalid_pin' });
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
    return res.status(503).json({ ok:false, error:'db_error' });
  }
}

module.exports = requireAdminPin;
module.exports.requireAdminPin = requireAdminPin;
