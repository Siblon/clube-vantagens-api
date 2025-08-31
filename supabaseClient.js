const { createClient } = require('@supabase/supabase-js');

let cached;
function getClient() {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    cached = null;
    return cached;
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}

function assertSupabase(res) {
  const client = getClient();
  if (!client) {
    if (res && !res.headersSent) {
      res.status(503).json({ ok: false, error: 'supabase_unconfigured' });
    }
    throw new Error('supabase_unconfigured');
  }
  return client;
}

module.exports = {
  get supabase() {
    return getClient();
  },
  assertSupabase
};
