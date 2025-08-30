function requireAdminPin(req, res, next) {
  const pin = ((req.query.pin || '') || (req.headers['x-admin-pin'] || '')).toString();
  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ ok: false, error: 'invalid_pin' });
  }
  next();
}
module.exports = { requireAdminPin };
