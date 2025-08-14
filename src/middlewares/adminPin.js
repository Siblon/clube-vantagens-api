export function requireAdminPin(req, res, next) {
  const expectedPin = process.env.ADMIN_PIN;
  const providedPin = req.get('x-admin-pin');

  if (!expectedPin || providedPin !== expectedPin) {
    return res
      .status(401)
      .json({ ok: false, error: 'PIN inválido', code: 'ADMIN_PIN_INVALID' });
  }

  next();
}
