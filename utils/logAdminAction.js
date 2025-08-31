const { supabase } = require('../supabaseClient');
const { hashPin } = require('./adminPin');

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

async function logAdminAction({ route, action, adminId, adminNome, pinHash, pin, clientCpf, payload }){
  try {
    if (!supabase || typeof supabase.from !== 'function' || !route || !action) return;
    if (!pinHash && pin) pinHash = hashPin(pin);
    if (!pinHash) return;
    const safePayload = sanitizePayload(payload);
    const table = supabase.from('audit_logs');
    if (!table || typeof table.insert !== 'function') return;
    await table.insert({
      route,
      action,
      admin_pin_hash: pinHash,
      admin_id: adminId || null,
      admin_nome: adminNome || null,
      client_cpf: clientCpf || null,
      payload: safePayload
    });
  } catch (err) {
    console.error('logAdminAction error', err.message);
  }
}

module.exports = logAdminAction;
