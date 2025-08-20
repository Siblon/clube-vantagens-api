// src/routes/admin.js
const express = require('express');
const supabase = require('../lib/supabase.js');
const { requireAdminPin } = require('../middlewares/adminPin.js');
const { ClienteCreate } = require('../schemas/admin.js');

const router = express.Router();

// Rota para criar cliente
router.post('/clientes', requireAdminPin, async (req, res) => {
  try {
    const data = ClienteCreate.parse(req.body);

    const { data: exists, error: existErr } = await supabase
      .from('clientes')
      .select('id')
      .eq('documento', data.documento)
      .maybeSingle();
    if (existErr) throw existErr;
    if (exists) {
      return res.status(409).json({ error: 'Cliente já existe' });
    }

    const { data: cli, error } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single();
    if (error) throw error;

    res.json(cli);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});


module.exports = router;

