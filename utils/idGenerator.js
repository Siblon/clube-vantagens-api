function gerarIdInterno() {
  const digits = '23456789';
  let out = 'C';
  for (let i = 0; i < 7; i++) {
    out += digits[Math.floor(Math.random() * digits.length)];
  }
  return out;
}

async function gerarIdUnico(supabase) {
  while (true) {
    const id = gerarIdInterno();
    const { data, error } = await supabase
      .from('clientes')
      .select('id')
      .eq('id_interno', id)
      .maybeSingle();
    if (!error && !data) return id;
  }
}

module.exports = { gerarIdInterno, gerarIdUnico };
