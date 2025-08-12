const supabase = require('../supabaseClient');

exports.status = (_req, res) => res.json({ ok: true });

exports.createCheckout = async (req, res) => {
  try {
    const cpf = String(req.body?.cpf || '').replace(/\D/g, '');
    const amount = Number(req.body?.amount);
    const desc = req.body?.desc;

    if (!/^\d{11}$/.test(cpf) || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'dados inválidos' });
    }

    const mpBody = {
      items: [
        {
          title: desc || 'Clube de Vantagens',
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(amount),
        },
      ],
      payer: { identification: { type: 'CPF', number: cpf } },
      back_urls: {
        success: `${process.env.APP_BASE_URL}/deploy-check.html?status=success`,
        failure: `${process.env.APP_BASE_URL}/deploy-check.html?status=failure`,
        pending: `${process.env.APP_BASE_URL}/deploy-check.html?status=pending`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.RAILWAY_URL}/mp/webhook?secret=${process.env.MP_WEBHOOK_SECRET}`,
      external_reference: cpf,
    };

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mpBody),
    });

    const data = await resp.json();
    if (!resp.ok || !data.init_point) {
      return res.status(400).json({ error: 'falha ao criar checkout' });
    }

    return res.json({ init_point: data.init_point });
  } catch (err) {
    return res.status(500).json({ error: 'erro interno' });
  }
};

async function logWebhook(type, body) {
  if (!supabase || typeof supabase.from !== 'function') return;
  try {
    await supabase.from('logs_webhook').insert({ type, body });
  } catch (_) {
    // tabela pode não existir; silenciosamente ignora
  }
}

exports.webhook = async (req, res) => {
  if (req.query?.secret !== process.env.MP_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const event = req.body || {};
  await logWebhook(event.type || event.action || 'unknown', event);

  try {
    if (event?.type !== 'payment' && !/^payment\./.test(event?.action || '')) {
      return res.status(204).end();
    }

    const paymentId = event?.data?.id;
    if (!paymentId) return res.status(204).end();

    const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await r.json();
    if (!r.ok) return res.status(204).end();

    if (payment.status === 'approved') {
      const cpf = payment.external_reference;
      try {
        const { data: cli } = await supabase
          .from('clientes')
          .select('id, nome, plano')
          .eq('cpf', cpf)
          .maybeSingle();
        if (cli) {
          await supabase.from('clientes').update({ status_pagamento: 'em dia' }).eq('id', cli.id);
          await supabase.from('transacoes').insert({
            cpf,
            cliente_nome: cli.nome,
            plano: cli.plano,
            valor_bruto: payment.transaction_amount,
            desconto_aplicado: 0,
            valor_final: payment.transaction_amount,
            origem: 'mercado-pago',
          });
        }
      } catch (_) {
        // ignora falhas do BD
      }
    }
  } catch (_) {
    // ignora erros da verificação
  }

  return res.status(204).end();
};
