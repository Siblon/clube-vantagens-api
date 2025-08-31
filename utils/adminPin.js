const crypto = require('crypto');

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function sanitizePin(pin) {
  const s = String(pin || '').trim();
  if (!/^\d{3,8}$/.test(s)) return null; // entre 3 e 8 dígitos
  return s;
}

module.exports = { hashPin, sanitizePin };
