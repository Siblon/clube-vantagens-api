const express = require('express');
const MP = require('mercadopago');
const supabase = require('../supabaseClient');
const { assertSupabase } = supabase;

const router = express.Router();

function envFlags() {
  return {
    access_token: !!process.env.MP_ACCESS_TOKEN,
    collector_id: !!process.env.MP_COLLECTOR_ID,
  };
}

function ensureEnv(res) {
  const have = envFlags();
  if (!have.access_token || !have.collector_id) {
    res.status(503).json({ ok: false, reason: 'missing_env', have });
    return false;
  }
  return true;
}

function mpClient() {
  return new MP.MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

async function status(_req, res) {
  if (!ensureEnv(res)) return;
  try {
    const user = new MP.User(mpClient());
    const info = await user.get();
    const collector_id = info && (info.id || info.collector_id || process.env.MP_COLLECTOR_ID);
    const live = typeof info?.live_mode === 'boolean' ? info.live_mode : false;
    res.json({ ok: true, collector_id, live });
  } catch (err) {
    console.error('MP_STATUS_ERR', err);
    res.status(err?.status || 502).json({ ok: false, reason: 'mp_error' });
  }
}

async function createCheckout(req, res) {
  if (!ensureEnv(res)) return;
  if (!assertSupabase(res)) return;
  try {
    const { externalReference } = req.body || {};
    if (!externalReference) {
      return res.status(400).json({ ok: false, reason: 'missing_external_reference' });
    }

    const { data: tx, error: txErr } = await supabase
      .from('transacoes')
      .select('id, valor_final, valor_original, cliente_nome, cpf, plano')
      .eq('id', externalReference)
      .maybeSingle();
    if (txErr) return res.status(500).json({ ok: false, reason: 'db_error' });
    if (!tx) return res.status(404).json({ ok: false, reason: 'not_found' });

    const amount = Number(tx.valor_final || tx.valor_original || 0);
    const pref = new MP.Preference(mpClient());
    const preference = await pref.create({
      body: {
        items: [
          {
            title: `Pagamento ${tx.cliente_nome || ''}`.trim() || 'Pagamento',
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          },
        ],
        external_reference: String(externalReference),
        notification_url: `${process.env.APP_BASE_URL || ''}/mp/webhook?secret=${process.env.MP_WEBHOOK_SECRET}`,
        back_urls: {
          success: process.env.APP_BASE_URL || '',
          failure: process.env.APP_BASE_URL || '',
          pending: process.env.APP_BASE_URL || '',
        },
        auto_return: 'approved',
      },
    });

    const link = preference.init_point || preference.sandbox_init_point;

    await supabase
      .from('transacoes')
      .update({
        mp_preference_id: preference.id,
        link_pagamento: link,
        status_pagamento: 'pendente',
      })
      .eq('id', externalReference);

    res.json({ ok: true, init_point: link, preference_id: preference.id });
  } catch (err) {
    console.error('MP_CHECKOUT_ERR', err);
    res.status(502).json({ ok: false, reason: 'mp_error' });
  }
}

async function webhook(req, res) {
  if (req.query.secret !== process.env.MP_WEBHOOK_SECRET) return res.sendStatus(401);
  if (!assertSupabase(res)) return;
  try {
    const id = req.body?.data?.id || req.body?.id;
    if (!id) return res.sendStatus(200);
    const payment = new MP.Payment(mpClient());
    const info = await payment.get({ id });
    if (info?.status === 'approved') {
      const ref = info.external_reference;
      if (ref) {
        const { data: tx } = await supabase
          .from('transacoes')
          .select('cpf')
          .eq('id', ref)
          .maybeSingle();
        await supabase
          .from('transacoes')
          .update({ status_pagamento: 'approved', mp_payment_id: info.id })
          .eq('id', ref);
        if (tx?.cpf) {
          await supabase
            .from('clientes')
            .update({ status_pagamento: 'em dia' })
            .eq('cpf', tx.cpf);
        }
      }
    }
  } catch (err) {
    console.error('MP_WEBHOOK_ERR', err);
  }
  res.sendStatus(200);
}

router.get('/status', status);
router.post('/checkout', express.json(), createCheckout);
router.post('/webhook', webhook);

module.exports = router;

