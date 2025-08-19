// src/middlewares/adminPin.js
function requireAdminPin(req, res, next) {
  const pinHeader = req.get('x-admin-pin');
  const pinQuery = req.query.pin;
  const pin = pinHeader || pinQuery;

  if (!process.env.ADMIN_PIN || pin !== process.env.ADMIN_PIN) {
    return res.status(401).json({ error: 'admin_pin_required' });
  }
  return next();
}

module.exports = { requireAdminPin };
