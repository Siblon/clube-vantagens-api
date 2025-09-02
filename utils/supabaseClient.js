const { createClient } = require('@supabase/supabase-js');
const env = require('../config/env');
const supabase = require('../services/supabase');

// Client público (se algum endpoint precisar explicitamente)
const supabasePublic = createClient(env.SUPABASE_URL, env.SUPABASE_ANON || 'invalid', {
  auth: { persistSession: false },
});

module.exports = { supabase, supabasePublic };

