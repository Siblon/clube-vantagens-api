function getPin() {
  return localStorage.getItem('ADMIN_PIN') || '';
}

function setPin(pin) {
  localStorage.setItem('ADMIN_PIN', pin);
}

function withPinHeaders(headers = {}) {
  return { ...headers, 'x-admin-pin': getPin() };
}

function showMessage(message, type = 'success') {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = message;
  el.style.color = type === 'error' ? 'red' : 'green';
}
