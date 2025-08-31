function getPin() {
  return localStorage.getItem('ADMIN_PIN') || '';
}

function setPin(pin) {
  localStorage.setItem('ADMIN_PIN', pin);
}

function withPinHeaders(init = {}) {
  const headers = new Headers(init.headers || {});
  const pin = getPin();
  if (pin) headers.set('x-admin-pin', pin);
  return { ...init, headers };
}

function showMessage(message, type = 'success') {
  const el = document.getElementById('message');
  if (!el) return;
  el.textContent = message;
  el.className = type === 'error' ? 'error' : 'success';
}

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('save-pin');
  if (pinInput) pinInput.value = getPin();
  saveBtn?.addEventListener('click', () => {
    setPin(pinInput?.value || '');
    showMessage('PIN salvo', 'success');
  });
});

window.getPin = getPin;
window.setPin = setPin;
window.withPinHeaders = withPinHeaders;
window.showMessage = showMessage;
