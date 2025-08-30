const { supabase } = require('../supabaseClient');

(async () => {
  if (typeof supabase.from !== 'function') {
    console.error('Supabase não configurado');
    process.exit(1);
  }
  const { data, error } = await supabase.from('clientes').select('id').limit(1);
  if (error) {
    console.error('Erro Supabase:', error.message);
    process.exit(1);
  }
  console.log('Supabase OK', data);
  process.exit(0);
})();
