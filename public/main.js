const API_BASE = window.API_BASE || '';

const valorInput = document.getElementById('valor');
const cpfInput   = document.getElementById('cpf');

function sanitizeCPF(str='') {
  return (str.match(/\d/g) || []).join('').slice(0, 11);
}

function maskCPF(el) {
  el.addEventListener('input', () => {
    const d = sanitizeCPF(el.value);
    // 000.000.000-00
    let out = d;
    if (d.length > 3)  out = d.slice(0,3) + '.' + d.slice(3);
    if (d.length > 6)  out = out.slice(0,7) + '.' + out.slice(7);
    if (d.length > 9)  out = out.slice(0,11) + '-' + out.slice(11);
    el.value = out;
  });
}

function normalizeMoneyTyping(str='') {
  // Mantém dígitos e um separador (.,,) → usa vírgula
  str = String(str).replace(/[^\d.,]/g, '').replace(/\./g, ',');
  // mantém apenas a primeira vírgula
  const firstComma = str.indexOf(',');
  if (firstComma !== -1) {
    const head = str.slice(0, firstComma+1).replace(/,/g,'');
    const tail = str.slice(firstComma+1).replace(/,/g,'');
    str = head + tail;
  }
  // limita a 2 casas
  const parts = str.split(',');
  if (parts[1]?.length > 2) {
    str = parts[0] + ',' + parts[1].slice(0,2);
  }
  // remove zeros à esquerda redundantes (exceto antes de vírgula)
  if (!str.includes(',')) {
    str = str.replace(/^0+(?=\d)/, '');
  } else {
    const [int, dec=''] = str.split(',');
    const intClean = int.replace(/^0+(?=\d)/, '') || '0';
    str = intClean + ',' + dec;
  }
  return str;
}

function formatBRL(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
}

function getValorNumber() {
  // Lê o valor atual do input, esteja formatado (R$) ou não
  let v = valorInput.value;
  if (!v) return NaN;
  v = v.replace(/[^\d,.-]/g, '').replace(/\./g,'').replace(',', '.'); // “1.234,56” → “1234.56”
  const num = Number(v);
  return Number.isFinite(num) ? num : NaN;
}

/* ---- Wire do input Valor (edit-friendly) ---- */
function wireValorInput() {
  // Evitar formatar enquanto digita
  valorInput.addEventListener('input', () => {
    const pos = valorInput.selectionStart;
    const before = valorInput.value;
    valorInput.value = normalizeMoneyTyping(before);
    // estratégia simples: posiciona cursor no fim (suficiente p/ balcão)
    valorInput.setSelectionRange(valorInput.value.length, valorInput.value.length);
  });

  valorInput.addEventListener('focus', () => {
    // Se estiver como BRL, desfaz para "n,n"
    const num = getValorNumber();
    if (Number.isFinite(num)) {
      // volta para formato digitável com vírgula
      const parts = num.toFixed(2).split('.');
      valorInput.value = parts[0] + ',' + parts[1];
      valorInput.setSelectionRange(valorInput.value.length, valorInput.value.length);
    } else {
      valorInput.value = '';
    }
  });

  valorInput.addEventListener('blur', () => {
    const n = getValorNumber();
    if (Number.isFinite(n) && n >= 0) {
      valorInput.value = formatBRL(n);
    } else {
      valorInput.value = '';
    }
  });

  // Sanitiza também colagens
  valorInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    valorInput.value = normalizeMoneyTyping(text);
  });
}

/* ---- Health e toasts (mantém o que já existe) ---- */
async function checkApiStatus() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    setStatusDot(res.ok ? 'ok' : 'warn');
  } catch {
    setStatusDot('down');
  }
}
function setStatusDot(state) {
  const dot = document.getElementById('api-status');
  dot.className = 'status-dot ' + (state==='ok'?'status-dot--ok':state==='warn'?'status-dot--warn':'status-dot--down');
}
function showToast(type, msg){
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role', 'status');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
function setLoading(btn, isLoading){
  if (isLoading) {
    btn.disabled = true;
    btn.classList.add('btn--loading');
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Processando...';
  } else {
    btn.disabled = false;
    btn.classList.remove('btn--loading');
    if (btn.dataset.label) btn.textContent = btn.dataset.label;
  }
}

/* ---- Render do card ---- */
function renderResultado(data, { showFinance = false } = {}) {
  const rowDesc  = document.getElementById('row-desc');
  const rowValor = document.getElementById('row-valor');

  document.getElementById('out-nome').textContent  = data?.nome ?? '—';
  document.getElementById('out-plano').textContent = data?.plano ?? '—';
  document.getElementById('out-status').textContent= data?.statusPagamento ?? '—';
  document.getElementById('out-venc').textContent  = data?.vencimento ?? '—';

  if (showFinance) {
    rowDesc.classList.remove('hidden');
    rowValor.classList.remove('hidden');
    document.getElementById('out-desc').textContent  = (data?.descontoAplicado ?? '—') + (data?.descontoAplicado!=null?'%':'');
    document.getElementById('out-valor').textContent = (data?.valorFinal!=null) ? formatBRL(data.valorFinal) : '—';
  } else {
    rowDesc.classList.add('hidden');
    rowValor.classList.add('hidden');
    document.getElementById('out-desc').textContent  = '—';
    document.getElementById('out-valor').textContent = '—';
  }
}

/* ---- Ações ---- */
async function onConsultar(e){
  e?.preventDefault?.();
  const cpf = sanitizeCPF(cpfInput.value);
  if (cpf.length !== 11) return showToast('error','CPF inválido');

  const btn = document.getElementById('btn-consultar');
  setLoading(btn, true);
  try{
    const res = await fetch(`${API_BASE}/assinaturas?cpf=${cpf}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'Cliente não encontrado' : 'Erro ao consultar');
    const data = await res.json();
    renderResultado(data, { showFinance:false });
  } catch(err){
    showToast('error', err.message || 'Falha na consulta');
  } finally {
    setLoading(btn, false);
  }
}

async function onRegistrar(e){
  e?.preventDefault?.();
  const cpf = sanitizeCPF(cpfInput.value);
  const valor = getValorNumber();
  if (cpf.length !== 11) return showToast('error','CPF inválido');
  if (!Number.isFinite(valor) || valor <= 0) return showToast('error','Informe um valor válido');

  const btn = document.getElementById('btn-registrar');
  setLoading(btn, true);
  try{
    const res = await fetch(`${API_BASE}/transacao`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ cpf, valor })
    });
    if (!res.ok) throw new Error('Erro ao registrar transação');
    const data = await res.json();
    renderResultado(data, { showFinance:true });
    showToast('success','Transação registrada');
  } catch(err){
    showToast('error', err.message || 'Falha ao registrar');
  } finally {
    setLoading(btn, false);
  }
}

/* ---- Init ---- */
function init() {
  maskCPF(cpfInput);
  wireValorInput();
  document.getElementById('btn-consultar').addEventListener('click', onConsultar);
  document.getElementById('btn-registrar').addEventListener('click', onRegistrar);
  // atalhos: Enter = Consultar / Ctrl+Enter = Registrar
  document.addEventListener('keydown',(e)=>{
    if (e.key === 'Enter' && e.ctrlKey) { onRegistrar(e); }
    else if (e.key === 'Enter') { onConsultar(e); }
  });
  checkApiStatus();
}

document.addEventListener('DOMContentLoaded', init);
