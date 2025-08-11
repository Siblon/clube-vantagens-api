// supabaseClient.js
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {
  // dotenv opcional
}

let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch (e) {
  // fallback stub
  createClient = () => {
    const handler = {
      get(_t, prop) {
        if (prop === 'then') {
          return (resolve) => resolve({ data: [], error: null, count: 0 });
        }
        return () => new Proxy({}, handler);
      }
    };
    return { from() { return new Proxy({}, handler); } };
  };
}

// Leia as variáveis do .env
const SUPABASE_URL  = process.env.SUPABASE_URL || 'stub';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'stub';
if (SUPABASE_URL === 'stub' || SUPABASE_ANON === 'stub') {
  console.warn('⚠️ Variáveis SUPABASE_URL/SUPABASE_ANON ausentes, usando stub');
}

// Cria o client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Ping opcional (comente se quiser)
async function _pingOnce() {
  try {
    const { error } = await supabase.from('clientes').select('id').limit(1);
    if (error) console.warn('⚠️ Ping Supabase avisou:', error.message);
    else console.log('✅ Supabase client pronto.');
  } catch (e) {
    console.warn('⚠️ Falha no ping Supabase:', e.message);
  }
}
_pingOnce();

module.exports = supabase;
