function requireAdminPin(req, res, next) {
  const pin = req.get('x-admin-pin') || req.query.pin;
  if (!pin || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'PIN inválido' });
  }
  next();
}

module.exports = { requireAdminPin };
