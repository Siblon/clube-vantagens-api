const { supabase, assertSupabase } = require('../supabaseClient');
const { hashPin } = require('../utils/adminPin');

async function requireAdminPin(req, res, next){
  try {
    const pin = (req.query.pin || req.headers['x-admin-pin'] || '').toString();
    if(!pin){
      return res.status(401).json({ ok:false, error:'invalid_pin' });
    }

    // Fallback para PIN global via env (útil em testes/legacy)
    if(process.env.ADMIN_PIN && pin === process.env.ADMIN_PIN){
      req.adminId = 0;
      req.adminNome = process.env.ADMIN_NOME || 'admin';
      req.adminPinHash = hashPin(pin);
      return next();
    }

    if(!supabase || typeof supabase.from !== 'function'){
      return res.status(401).json({ ok:false, error:'invalid_pin' });
    }
    if(!assertSupabase(res)) return;

    const pinHash = hashPin(pin);
    const { data, error } = await supabase
      .from('admins')
      .select('id,nome')
      .eq('pin_hash', pinHash)
      .maybeSingle();

    if(error || !data){
      return res.status(401).json({ ok:false, error:'invalid_pin' });
    }

    req.adminId = data.id;
    req.adminNome = data.nome;
    req.adminPinHash = pinHash;
    next();
  } catch (err) {
    return res.status(500).json({ ok:false, error:'pin_check_failed' });
  }
}

module.exports = { requireAdminPin };
