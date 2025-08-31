const crypto = require('crypto');

const SALT = process.env.ADMIN_PIN_SALT || '';

function hashPin(pin){
  return crypto.createHash('sha256').update(String(pin) + SALT).digest('hex');
}

module.exports = { hashPin };
