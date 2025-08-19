// src/lib/supabase.js
// Reexporta o client raiz em CommonJS para compatibilidade com Jest
const supabase = require('../../supabaseClient.js');
module.exports = supabase;
