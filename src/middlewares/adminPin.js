const META = { version: 'v0.1.0' };
function readPin(req) {
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
    return res.status(503).json({ ok: false, error: 'ADMIN_PIN ausente no servidor', meta: META });
  }
  if (provided !== expected) {
    return res.status(401).json({ ok: false, error: 'PIN inválido', meta: META });
  }
  return next();
}
module.exports = { requireAdminPin, default: requireAdminPin };
