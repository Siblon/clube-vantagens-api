const API_BASE = '';

function formatBRL(n) {
  return Number(n).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function parseBRL(str) {
  const n = Number(str.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function sanitizeCPF(str) {
  return str.replace(/\D/g, '').slice(0, 11);
}

function maskCPF(input) {
  const digits = sanitizeCPF(input.value);
  input.value = digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function maskBRL(input) {
  const n = parseBRL(input.value);
  input.value = n
    ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';
}

async function checkApiStatus() {
  const dot = document.getElementById('api-status');
  const text = document.getElementById('api-status-text');
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 2000);
  try {
    let res;
    try {
      res = await fetch(`${API_BASE}/health`, { signal: controller.signal, cache: 'no-store' });
    } catch (err) {
      res = await fetch(`${API_BASE}/`, { signal: controller.signal, cache: 'no-store' });
    }
    if (res.ok) {
      dot.className = 'status-dot status-dot--ok';
      text.textContent = 'online';
    } else {
      dot.className = 'status-dot status-dot--warn';
      text.textContent = 'instável';
    }
  } catch (err) {
    const warn = err.name === 'AbortError';
    dot.className = warn ? 'status-dot status-dot--warn' : 'status-dot status-dot--down';
    text.textContent = warn ? 'instável' : 'offline';
  } finally {
    clearTimeout(t);
  }
}

function showToast(type, message) {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function setLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add('btn--loading');
    button.dataset.label = button.textContent;
    button.textContent = 'Processando...';
  } else {
    button.disabled = false;
    button.classList.remove('btn--loading');
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}

const rowDesc = document.querySelector('.row-desc');
const rowValor = document.querySelector('.row-valor');

function hideFinanceRows() {
  rowDesc.classList.add('hidden');
  rowValor.classList.add('hidden');
}

function showFinanceRows() {
  rowDesc.classList.remove('hidden');
  rowValor.classList.remove('hidden');
}

function showSkeleton(show, { showFinance = false } = {}) {
  const card = document.getElementById('resultado');
  if (show) card.hidden = false;
  card.querySelectorAll('.value, .badge').forEach((el) => {
    if (show) {
      el.textContent = '';
      el.classList.add('skeleton');
    } else {
      el.classList.remove('skeleton');
    }
  });
  if (showFinance) {
    showFinanceRows();
  } else {
    hideFinanceRows();
  }
}

function renderResultado(data, { showFinance = false } = {}) {
  document.getElementById('out-nome').textContent = data.nome;
  document.getElementById('out-plano').textContent = data.plano;
  const status = document.getElementById('out-status');
  status.textContent = data.statusPagamento;
  status.className =
    'badge ' + (data.statusPagamento === 'em dia' ? 'badge--success' : 'badge--warning');
  document.getElementById('out-venc').textContent = data.vencimento;

  const desc = data.descontoAplicado !== undefined ? `${data.descontoAplicado}%` : '—';
  const valor =
    data.valorFinal !== undefined ? formatBRL(data.valorFinal) : '—';
  document.getElementById('out-desc').textContent = desc;
  document.getElementById('out-valor').textContent = valor;

  if (showFinance) {
    showFinanceRows();
  } else {
    hideFinanceRows();
  }

  document.getElementById('resultado').hidden = false;
}

function getCPF() {
  const input = document.getElementById('cpf');
  const cpf = sanitizeCPF(input.value);
  maskCPF(input);
  return cpf;
}

function getValor() {
  const input = document.getElementById('valor');
  const valor = parseBRL(input.value);
  maskBRL(input);
  return valor;
}

async function onConsultar() {
  const btn = document.getElementById('btn-consultar');
  const cpf = getCPF();
  if (cpf.length !== 11) {
    showToast('error', 'CPF inválido');
    return;
  }

  showSkeleton(true, { showFinance: false });
  setLoading(btn, true);
  try {
    const res = await fetch(`${API_BASE}/assinaturas?cpf=${cpf}`);
    if (res.status === 404) {
      showToast('error', 'Cliente não encontrado');
      document.getElementById('resultado').hidden = true;
      return;
    }
    if (!res.ok) throw new Error();
    const data = await res.json();
    showSkeleton(false, { showFinance: false });
    renderResultado(data, { showFinance: false });
  } catch (err) {
    showSkeleton(false);
    showToast('error', 'indisponível');
    document.getElementById('resultado').hidden = true;
  } finally {
    setLoading(btn, false);
  }
}

async function onRegistrar() {
  const btn = document.getElementById('btn-registrar');
  const cpf = getCPF();
  const valor = getValor();
  if (cpf.length !== 11) {
    showToast('error', 'CPF inválido');
    return;
  }
  if (!valor || valor <= 0) {
    showToast('error', 'Valor inválido');
    return;
  }

  showSkeleton(true, { showFinance: true });
  setLoading(btn, true);
  try {
    const res = await fetch(`${API_BASE}/transacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, valor }),
    });
    if (res.status === 404) {
      showToast('error', 'Cliente não encontrado');
      document.getElementById('resultado').hidden = true;
      return;
    }
    if (!res.ok) throw new Error();
    const data = await res.json();
    showSkeleton(false, { showFinance: true });
    renderResultado(data, { showFinance: true });
    showToast('success', 'Transação registrada');
  } catch (err) {
    showSkeleton(false);
    showToast('error', 'indisponível');
    document.getElementById('resultado').hidden = true;
  } finally {
    setLoading(btn, false);
  }
}

function startScanner() {
  if (window.Html5Qrcode) {
    const scanner = new Html5Qrcode('qr-reader');
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, () => {}, () => {});
  }
}

function addInputMasks() {
  const cpf = document.getElementById('cpf');
  const valor = document.getElementById('valor');
  cpf.addEventListener('input', () => maskCPF(cpf));
  valor.addEventListener('input', () => maskBRL(valor));
}

function addShortcuts() {
  const form = document.getElementById('form-transacao');
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      onRegistrar();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onConsultar();
    }
  });
}

function init() {
  document.getElementById('btn-consultar').addEventListener('click', onConsultar);
  document.getElementById('btn-registrar').addEventListener('click', onRegistrar);
  document.getElementById('btn-scanner').addEventListener('click', startScanner);
  addInputMasks();
  addShortcuts();
  checkApiStatus();
}

document.addEventListener('DOMContentLoaded', init);
