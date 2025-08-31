function getPin() {
  return localStorage.getItem('ADMIN_PIN') || '';
}

function setPin(pin) {
  localStorage.setItem('ADMIN_PIN', pin);
}

function getNome() {
  return localStorage.getItem('ADMIN_NOME') || '';
}

function setNome(nome) {
  if (nome) localStorage.setItem('ADMIN_NOME', nome);
  else localStorage.removeItem('ADMIN_NOME');
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

function updateNomeDisplay() {
  const el = document.getElementById('admin-name-display');
  if (!el) return;
  const nome = getNome();
  el.textContent = nome ? `Logado como: ${nome}` : '';
}

async function refreshAdminInfo() {
  try {
    const resp = await fetch('/admin/whoami', { headers: withPinHeaders() });
    if (!resp.ok) throw new Error('invalid');
    const data = await resp.json().catch(() => null);
    const nome = data?.admin?.nome || '';
    setNome(nome);
    updateNomeDisplay();
    return true;
  } catch (_) {
    setNome('');
    updateNomeDisplay();
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('save-pin');
  if (pinInput) pinInput.value = getPin();

  let nameEl = document.getElementById('admin-name-display');
  if (!nameEl && saveBtn?.parentNode) {
    nameEl = document.createElement('span');
    nameEl.id = 'admin-name-display';
    nameEl.style.marginLeft = '8px';
    saveBtn.parentNode.appendChild(nameEl);
  }

  updateNomeDisplay();
  if (getPin()) refreshAdminInfo();

  saveBtn?.addEventListener('click', async () => {
    setPin(pinInput?.value || '');
    const ok = await refreshAdminInfo();
    showMessage(ok ? 'PIN salvo' : 'PIN inválido', ok ? 'success' : 'error');
  });
});

window.getPin = getPin;
window.setPin = setPin;
window.withPinHeaders = withPinHeaders;
window.showMessage = showMessage;
window.refreshAdminInfo = refreshAdminInfo;
