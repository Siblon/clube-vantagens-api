// supabaseClient.js
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { createClient } = require('@supabase/supabase-js');

// Leia as variáveis do .env
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;

// Validação amigável
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('❌ Variáveis ausentes.');
  console.error('cwd:', process.cwd());
  console.error('SUPABASE_URL:', SUPABASE_URL ? '(ok)' : '(faltando)');
  console.error('SUPABASE_ANON:', SUPABASE_ANON ? '(ok)' : '(faltando)');
  throw new Error('Vars SUPABASE_URL/SUPABASE_ANON ausentes do .env');
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
