const supabase = require('../supabaseClient');
(async () => {
  const { data, error } = await supabase.from('clientes').select('id').limit(1);
  if (error) {
    console.error('Erro Supabase:', error.message);
    process.exit(1);
  }
  console.log('Supabase OK', data);
  process.exit(0);
})();
