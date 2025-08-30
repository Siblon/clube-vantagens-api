const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL  = process.env.SUPABASE_URL || '';
const SUPABASE_ANON = process.env.SUPABASE_ANON || '';
const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession:false } })
  : null;
function assertSupabase(res){
  if(!SUPABASE_URL || !SUPABASE_ANON){ res?.status?.(500)?.json?.({ ok:false, error:'supabase_not_configured' }); return false; }
  if(!supabase){ res?.status?.(500)?.json?.({ ok:false, error:'supabase_client_unavailable' }); return false; }
  return true;
}
module.exports = { supabase, assertSupabase };
