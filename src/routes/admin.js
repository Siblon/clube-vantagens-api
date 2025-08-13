const express = require('express');
const supabase = require('../lib/supabase');
const { requireAdminPin } = require('../middlewares/adminPin');
const { ClienteCreate, AssinaturaCreate } = require('../schemas/admin');
const { toCents, fromCents } = require('../utils/currency');

const router = express.Router();

router.post('/clientes', requireAdminPin, async (req, res) => {
  try {
    const payload = ClienteCreate.parse(req.body);
    const { data: exists, error: exErr } = await supabase
      .from('clientes')
      .select('id')
      .eq('documento', payload.documento)
      .maybeSingle();
    if (exErr) throw exErr;
    if (exists) return res.status(409).json({ error: 'Cliente já existe' });

    const { data, error } = await supabase
      .from('clientes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/assinatura', requireAdminPin, async (req, res) => {
  try {
    const p = AssinaturaCreate.parse(req.body);

    let cliente_id = p.cliente_id;
    if (!cliente_id && p.documento) {
      const { data: cli, error } = await supabase
        .from('clientes')
        .select('id')
        .eq('documento', p.documento)
        .maybeSingle();
      if (error) throw error;
      if (!cli) return res.status(404).json({ error: 'Cliente não encontrado' });
      cliente_id = cli.id;
    }
    if (!cliente_id)
      return res.status(400).json({ error: 'Informe cliente_id ou documento' });

    const valor_original = toCents(p.valor);
    const insert = {
      cliente_id,
      plano: p.plano,
      forma_pagamento: p.forma_pagamento,
      valor_original,
      desconto_aplicado: 0,
      valor_final: valor_original,
      status_pagamento: 'pendente',
      vencimento: p.vencimento ?? null,
    };

    const { data: trx, error: insErr } = await supabase
      .from('transacoes')
      .insert(insert)
      .select()
      .single();
    if (insErr) throw insErr;

    res.json({
      ...trx,
      valor_original_reais: fromCents(trx.valor_original),
      valor_final_reais: fromCents(trx.valor_final),
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
