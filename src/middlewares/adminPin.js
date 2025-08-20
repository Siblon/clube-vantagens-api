// src/middlewares/adminPin.js
// CommonJS com compat ESM via import() { requireAdminPin }
const META = { version: 'v0.1.0' };

function readPin(req) {
  // aceita vários jeitos para reduzir atrito
  const h = req.headers || {};
  return (
    (h['x-admin-pin'] ?? h['X-Admin-Pin'] ?? h['x-admin-key'] ?? h['admin-pin']) ||
    (req.body && (req.body.pin || req.body.admin_pin)) ||
    (req.query && (req.query.pin || req.query.admin_pin)) ||
    ''
  ).toString();
}

function requireAdminPin(req, res, next) {
  const expected = (process.env.ADMIN_PIN || '').toString();
  const provided = readPin(req);
  if (!expected) {
    // Sem PIN configurado -> bloqueia e responde JSON padronizado
    return res
      .status(503)
      .json({ ok: false, error: 'ADMIN_PIN ausente no servidor', meta: META });
  }
  if (provided !== expected) {
    return res
      .status(401)
      .json({ ok: false, error: 'PIN inválido', meta: META });
  }
  return next();
}

module.exports = { requireAdminPin, default: requireAdminPin };
