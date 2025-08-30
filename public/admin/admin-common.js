function getPin() {
  return localStorage.getItem('ADMIN_PIN') || '';
}

function setPin(pin) {
  localStorage.setItem('ADMIN_PIN', pin);
}

function withPinHeaders(headers = {}) {
  return { ...headers, 'x-admin-pin': getPin() };
}
