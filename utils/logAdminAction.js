const crypto = require('crypto');
const { supabase } = require('../supabaseClient');

function sanitizePayload(payload){
  if (!payload || typeof payload !== 'object') return null;
  const out = {};
  for (const [k,v] of Object.entries(payload)){
    const key = k.toLowerCase();
    if (key.includes('pin') || key.includes('password') || key === 'email' || key === 'telefone' || key === 'phone') continue;
    let val = v;
    if (typeof val === 'string' && val.length > 100) val = val.slice(0,100) + '...';
    out[k] = val;
  }
  return Object.keys(out).length ? out : null;
}

async function logAdminAction({ route, action, pin, clientCpf, payload }){
  try {
    if (!supabase || typeof supabase.from !== 'function' || !pin || !route || !action) return;
    const salt = process.env.AUDIT_SALT || '';
    const admin_pin_hash = crypto.createHash('sha256').update(pin + salt).digest('hex');
    const safePayload = sanitizePayload(payload);
    const table = supabase.from('audit_logs');
    if (!table || typeof table.insert !== 'function') return;
    await table.insert({
      route,
      action,
      admin_pin_hash,
      client_cpf: clientCpf || null,
      payload: safePayload
    });
  } catch (err) {
    console.error('logAdminAction error', err.message);
  }
}

module.exports = logAdminAction;
