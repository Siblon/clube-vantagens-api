const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');

// ⚠️ SEMPRE service role aqui (server-side)
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabase;
