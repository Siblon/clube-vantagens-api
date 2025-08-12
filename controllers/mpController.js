const { MercadoPagoConfig, Preference } = require('mercadopago');

function cfg() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN ausente');
  return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
}

exports.status = async (_req, res) => {
  res.json({
    ok: true,
    collector: process.env.MP_COLLECTOR_ID || null,
    hasAccessToken: !!process.env.MP_ACCESS_TOKEN,
  });
};

/**
 * Body esperado:
 * {
 *   title: "Compra no Clube",
 *   quantity: 1,
 *   unit_price: 25.50,     // em BRL
 *   payer: { email: "cliente@email.com" },   // opcional
 *   external_reference: "pedido-123"         // opcional
 * }
 */
exports.createCheckout = async (req, res) => {
  try {
    const { title = 'Clube de Vantagens', quantity = 1, unit_price, payer = {}, external_reference } = req.body || {};
    if (typeof unit_price !== 'number' || unit_price <= 0) {
      return res.status(400).json({ error: 'unit_price inválido' });
    }

    const mp = cfg();
    const preference = new Preference(mp);

    const notification_url =
      process.env.MP_NOTIFICATION_URL ||
      `${req.protocol}://${req.get('host')}/mp/webhook`;

    const back_urls = {
      success: process.env.MP_BACK_URLS_SUCCESS || `${req.protocol}://${req.get('host')}/deploy-check.html?ok=1`,
      pending: process.env.MP_BACK_URLS_PENDING || `${req.protocol}://${req.get('host')}/deploy-check.html?pending=1`,
      failure: process.env.MP_BACK_URLS_FAILURE || `${req.protocol}://${req.get('host')}/deploy-check.html?fail=1`,
    };

    const pref = await preference.create({
      body: {
        items: [
          {
            title,
            quantity,
            unit_price,
            currency_id: 'BRL'
          }
        ],
        payer,
        back_urls,
        auto_return: 'approved',
        notification_url,
        external_reference,
        statement_descriptor: 'CLUBE-VANTAGENS'
      }
    });

    return res.json({
      ok: true,
      id: pref.id,
      init_point: pref.init_point,
      sandbox_init_point: pref.sandbox_init_point || null
    });
  } catch (err) {
    console.error('MP_CHECKOUT_ERR:', err);
    return res.status(500).json({ error: 'mp_checkout_falhou' });
  }
};

exports.webhook = async (req, res) => {
  try {
    // Mercado Pago costuma enviar { action, data: { id }, type, ... }
    console.log('MP_WEBHOOK', {
      headers: req.headers,
      body: req.body
    });
    // Confirme com 200 para evitar reenvio. Processamento real pode ser assíncrono.
    return res.sendStatus(200);
  } catch (e) {
    console.error('MP_WEBHOOK_ERR', e);
    return res.sendStatus(500);
  }
};

