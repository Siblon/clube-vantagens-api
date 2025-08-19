// src/routes/admin.js
const express = require('express');
const supabase = require('../lib/supabase.js');
const { requireAdminPin } = require('../middlewares/adminPin.js');
const { ClienteCreate, AssinaturaCreate } = require('../schemas/admin.js');
const { toCents, fromCents } = require('../utils/currency.js');

const PLAN_PRICES = {
  basico: 4990,
};

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

// Rota para criar assinatura
router.post('/assinatura', requireAdminPin, async (req, res) => {
  try {
    const payload = AssinaturaCreate.parse(req.body);
    let cliente_id = payload.cliente_id;

    if (!cliente_id && (payload.email || payload.documento)) {
      const { data: cli, error } = await supabase
        .from('clientes')
        .select('id')
        .eq(payload.email ? 'email' : 'documento', payload.email ?? payload.documento)
        .maybeSingle();
      if (error) throw error;
      if (!cli) {
        const err = new Error('Cliente não encontrado');
        err.status = 404;
        throw err;
      }
      cliente_id = cli.id;
    }

    if (!cliente_id) {
      const err = new Error('Informe cliente_id, email ou documento');
      err.status = 400;
      throw err;
    }

    const valor = PLAN_PRICES[payload.plano] ?? null;
    if (valor == null) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const insert = {
      plano: payload.plano,
      cliente_id,
      valor_original: valor,
      desconto_aplicado: 0,
      valor_final: valor,
      forma_pagamento: payload.forma_pagamento ?? 'pix',
      status_pagamento: 'pendente',
      vencimento: payload.vencimento ?? null,
    };

    const { data: trx, error } = await supabase
      .from('transacoes')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;

    res.status(201).json({
      ok: true,
      data: {
        id: trx.id,
        cliente_id: trx.cliente_id,
        plano: trx.plano,
        valor,
        valorBRL: fromCents(valor),
      },
      meta: { version: 'v0.1.0' },
    });
  } catch (e) {
    const status = e.status ?? 400;
    res.status(status).json({ error: e.message });
  }
});

module.exports = router;

