function requireAdminPin(req, res, next) {
  const expected = process.env.ADMIN_PIN || '2468';
  const pin = req.get('x-admin-pin') || req.query.pin;
  if (pin !== expected) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  next();
}

module.exports = { requireAdminPin };
