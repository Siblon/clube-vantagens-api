const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRole) {
  throw new Error('Supabase config missing: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// client com permissões de admin (para rotas internas)
const supabase = createClient(supabaseUrl, supabaseServiceRole, { auth: { persistSession: false } });

// client público (se precisar em algum endpoint aberto)
const supabasePublic =
  supabaseAnon ? createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } }) : null;

function assertSupabase(res) {
  if (!supabase) {
    if (res && !res.headersSent) {
      res.status(503).json({ ok: false, error: 'supabase_unconfigured' });
    }
    throw new Error('supabase_unconfigured');
  }
  return supabase;
}

module.exports = { supabase, supabasePublic, assertSupabase };
