const MP = require('mercadopago');

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

exports.status = async (_req, res) => {
  if (!ensureEnv(res)) return;
  try {
    const mp = new MP({ accessToken: process.env.MP_ACCESS_TOKEN });
    const info = await mp.users.get({});
    const collector_id = info && (info.id || info.collector_id || process.env.MP_COLLECTOR_ID);
    const live = typeof info?.live_mode === 'boolean' ? info.live_mode : false;
    res.json({ ok: true, collector_id, live });
  } catch (err) {
    console.error('MP_STATUS_ERR', err);
    res.status(err?.status || 502).json({ ok: false, reason: 'mp_error' });
  }
};

exports.createCheckout = async (_req, res) => {
  if (!ensureEnv(res)) return;
  res.status(501).json({ ok: false, reason: 'not_implemented' });
};

exports.webhook = async (_req, res) => {
  res.sendStatus(200);
};

