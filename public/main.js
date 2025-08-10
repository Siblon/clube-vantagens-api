const API_BASE = '';

function formatBRL(number) {
  return Number(number).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function sanitizeCPF(value) {
  return value.replace(/\D/g, '').slice(0, 11);
}

function cpfMask(value) {
  const digits = sanitizeCPF(value);
  const parts = [];
  parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 9));
  let result = parts.filter(Boolean).join('.');
  const rest = digits.slice(9, 11);
  if (rest) result += '-' + rest;
  return result;
}

function valorMask(value) {
  const digits = value.replace(/\D/g, '');
  const number = Number(digits) / 100;
  return number
    ? number.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '';
}

async function checkApiStatus() {
  const dot = document.getElementById('api-status');
  try {
    const res = await fetch(`${API_BASE}/planos`);
    dot.className = res.ok
      ? 'status-dot status-dot--ok'
      : 'status-dot status-dot--warn';
  } catch (err) {
    dot.className = 'status-dot status-dot--down';
  }
}

function showToast(type, message) {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function setLoading(isLoading) {
  const btn = document.getElementById('btn-aplicar');
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('btn--loading');
    btn.dataset.text = btn.textContent;
    btn.textContent = 'Processando...';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn--loading');
    if (btn.dataset.text) btn.textContent = btn.dataset.text;
  }
}

function renderResultado(data) {
  document.getElementById('out-nome').textContent = data.nome;
  document.getElementById('out-plano').textContent = data.plano;
  document.getElementById('out-desc').textContent = `${data.descontoAplicado}%`;
  document.getElementById('out-valor').textContent = formatBRL(data.valorFinal);
  const statusSpan = document.getElementById('out-status');
  statusSpan.textContent = data.statusPagamento;
  statusSpan.className =
    'badge ' +
    (data.statusPagamento === 'em dia'
      ? 'badge--success'
      : 'badge--warning');
  document.getElementById('out-venc').textContent = data.vencimento;
  document.getElementById('resultado').hidden = false;
}

async function onSubmit(e) {
  e.preventDefault();
  const cpfInput = document.getElementById('cpf');
  const valorInput = document.getElementById('valor');
  const cpf = sanitizeCPF(cpfInput.value);
  cpfInput.value = cpfMask(cpf);
  if (cpf.length !== 11) {
    showToast('error', 'CPF inválido');
    return;
  }
  const digits = valorInput.value.replace(/\D/g, '');
  const valor = Number(digits) / 100;
  valorInput.value = valorMask(valorInput.value);
  if (!valor || valor <= 0) {
    showToast('error', 'Valor inválido');
    return;
  }

  setLoading(true);
  try {
    const res = await fetch(`${API_BASE}/transacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, valor }),
    });
    if (!res.ok) {
      let msg = 'indisponível';
      try {
        const err = await res.json();
        msg = err.error || msg;
      } catch (e) {}
      if (/não encontrado/i.test(msg)) msg = 'cliente não encontrado';
      else if (/inativ[ao]/i.test(msg)) msg = 'plano inativo';
      else if (/valor|numéric/i.test(msg)) msg = 'valor inválido';
      showToast('error', msg);
      document.getElementById('resultado').hidden = true;
      return;
    }
    const data = await res.json();
    renderResultado(data);
    showToast('success', 'Desconto aplicado');
  } catch (err) {
    showToast('error', 'indisponível');
    document.getElementById('resultado').hidden = true;
  } finally {
    setLoading(false);
  }
}

function addInputMasks() {
  const cpfInput = document.getElementById('cpf');
  cpfInput.addEventListener('input', (e) => {
    e.target.value = cpfMask(e.target.value);
  });
  const valorInput = document.getElementById('valor');
  valorInput.addEventListener('input', (e) => {
    e.target.value = valorMask(e.target.value);
  });
}

function startScanner() {
  const container = document.getElementById('qr-reader');
  if (!container) return;
  const qrScanner = new Html5Qrcode(container.id);
  qrScanner
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 250 },
      (msg) => {
        const cpfInput = document.getElementById('cpf');
        cpfInput.value = cpfMask(msg);
        qrScanner.stop();
      },
      () => {}
    )
    .catch((err) => console.error('Erro ao iniciar scanner:', err));
}

function init() {
  document
    .getElementById('form-transacao')
    .addEventListener('submit', onSubmit);
  document
    .getElementById('btn-scanner')
    .addEventListener('click', startScanner);
  addInputMasks();
  checkApiStatus();
}

document.addEventListener('DOMContentLoaded', init);

