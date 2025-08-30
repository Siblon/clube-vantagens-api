function requireAdminPin(req, res, next) {
  const pinQuery = (req.query.pin || '').toString();
  const pinHeader = (req.headers['x-admin-pin'] || '').toString();
  const pin = pinQuery || pinHeader;

  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ ok: false, error: 'invalid_pin' });
  }
  return next();
}
module.exports = { requireAdminPin };
