import express from 'express';
import supabase from '../lib/supabase.js';
import { requireAdminPin } from '../middlewares/adminPin.js';
import { ClienteCreate, AssinaturaCreate } from '../schemas/admin.js';
import { toCents } from '../utils/currency.js';

const router = express.Router();

router.post('/clientes', requireAdminPin, async (req, res) => {
  try {
    const data = ClienteCreate.parse(req.body);
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

router.post('/assinatura', requireAdminPin, async (req, res) => {
  try {
    const payload = AssinaturaCreate.parse(req.body);
    let cliente_id = payload.cliente_id;
    if (!cliente_id && payload.documento) {
      const { data: cli, error } = await supabase
        .from('clientes')
        .select('id')
        .eq('documento', payload.documento)
        .maybeSingle();
      if (error) throw error;
      if (!cli) throw new Error('Cliente não encontrado pelo documento');
      cliente_id = cli.id;
    }
    if (!cliente_id) throw new Error('Informe cliente_id ou documento');
    const valor_original = toCents(payload.valor);
    const insert = {
      cliente_id,
      plano: payload.plano,
      forma_pagamento: payload.forma_pagamento,
      valor_original,
      desconto_aplicado: 0,
      valor_final: valor_original,
      status_pagamento: 'pendente',
      vencimento: payload.vencimento ?? null,
    };
    const { data: trx, error } = await supabase
      .from('transacoes')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    res.json(trx);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
