const supabase = require('../../services/supabase');

async function createCliente(req, res) {
  const { nome, email, telefone } = req.body || {};
  if (!nome || !email) {
    return res.status(400).json({ ok: false, error: 'nome e email são obrigatórios' });
  }
    try {
    const { data, error } = await supabase
      .from('clientes')
      .insert({ nome, email, telefone })
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, cliente: data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = { createCliente };
