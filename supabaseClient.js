// supabaseClient.js
const path = require('path');
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
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
  } catch (e) {
    console.warn('Supabase: falha ao criar client; rodando sem BD');
  }
} else {
  console.warn('Supabase: variáveis ausentes; rodando sem BD');
}

function assertSupabase(res) {
  if (!supabase) {
    res.status(503).json({ ok: false, message: 'Banco não configurado' });
    return false;
  }
  return true;
}

const exported = supabase || {};
exported.assertSupabase = assertSupabase;
module.exports = exported;

