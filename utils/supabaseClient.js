const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) throw new Error('Missing env SUPABASE_URL');
if (!supabaseServiceRole) throw new Error('Missing env SUPABASE_SERVICE_ROLE_KEY');

// Client “admin” (Service Role) — PARA O BACKEND
const supabase = createClient(supabaseUrl, supabaseServiceRole, {
  auth: { persistSession: false },
});

// Client público (se algum endpoint precisar explicitamente)
const supabasePublic = createClient(supabaseUrl, supabaseAnon || 'invalid', {
  auth: { persistSession: false },
});

module.exports = { supabase, supabasePublic };

