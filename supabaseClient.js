// supabaseClient.js
const path = require('path');
try {
  require('dotenv').config({
    path:
      process.env.DOTENV_CONFIG_PATH ||
      process.env.dotenv_config_path ||
      path.resolve(process.cwd(), '.env'),
  });
} catch (_) {
  // dotenv opcional
}

let supabase = null;
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON;

if (url && url.startsWith('http') && anon) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(url, anon);
    console.log(`Supabase conectado → ${url}`);
  } catch (_) {
    console.warn('Supabase: falha ao criar client; rodando sem BD');
  }
} else {
  console.warn('Supabase: variáveis ausentes; rodando sem BD');
}

function assertSupabase(res) {
  const has = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON);
  if (!has) {
    res.status(503).json({ ok: false, error: 'Supabase não configurado', meta: { version: 'v0.1.0' } });
    return false;
  }
  return true;
}

module.exports = supabase ? { ...supabase, assertSupabase } : { assertSupabase };
