const { createClient } = require('@supabase/supabase-js');

let supabase = null;
function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      supabase = createClient(url, key, { auth: { persistSession: false } });
    }
  }
  return supabase;
}

function assertSupabase(res) {
  const client = getSupabase();
  if (!client) {
    if (res) res.status(500).json({ ok: false, error: 'supabase_not_configured' });
    return null;
  }
  return client;
}

module.exports = { getSupabase, assertSupabase };
Object.defineProperty(module.exports, 'supabase', { get: getSupabase });
