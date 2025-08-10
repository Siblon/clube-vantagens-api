const API_BASE = window.API_BASE || '';

const valorEl = document.getElementById('valor');
const cpfInput = document.getElementById('cpf');

// ---- Modo de entrada --------------------------------------------------------
let wedgeActive = false;
let wedgeBuffer = '';
let wedgeTimer = null;
let qrInstance = null;
let qrActive = false;

function setModeBadge(text){ document.getElementById('mode-badge').textContent = 'modo: ' + text; }

function enableManualMode(){
  stopWedgeMode();
  stopQrMode();
  document.getElementById('qr-controls').classList.add('hidden');
  setModeBadge('manual');
}

function startWedgeMode(){
  stopQrMode();
  document.getElementById('qr-controls').classList.add('hidden');
  if (wedgeActive) return;
  wedgeActive = true; wedgeBuffer = '';
  window.addEventListener('keydown', wedgeKeydown, true);
  setModeBadge('leitor');
}

function stopWedgeMode(){
  if (!wedgeActive) return;
  wedgeActive = false; wedgeBuffer = '';
  window.removeEventListener('keydown', wedgeKeydown, true);
}

function wedgeKeydown(e){
  // ignora se um input está focado que NÃO seja o body (a não ser o CPF e queremos digitar manualmente)
  const target = e.target;
  const editable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
  // Aceitamos wedge mesmo com foco em body ou fora dos campos
  if (editable && target.id !== 'cpf') return;

  const now = Date.now();
  // reset se pausou muito
  if (wedgeTimer && (now - wedgeTimer) > 300) wedgeBuffer = '';

  if (e.key >= '0' && e.key <= '9'){
    wedgeBuffer += e.key;
  } else if (e.key === 'Enter' || e.key === 'Tab'){
    // finalizou leitura
    if (wedgeBuffer.length === 11){
      fillCpfAndConsult(wedgeBuffer);
    }
    wedgeBuffer = '';
    return;
  } else {
    // qualquer outra tecla zera
    wedgeBuffer = '';
    return;
  }

  wedgeTimer = now;
  // fallback: se acumulou 11 sem Enter, consulta mesmo assim
  if (wedgeBuffer.length === 11){
    fillCpfAndConsult(wedgeBuffer);
    wedgeBuffer = '';
  }
}

async function startQrMode(){
  stopWedgeMode();
  document.getElementById('qr-controls').classList.remove('hidden');
  if (qrActive) return;

  const camSel = document.getElementById('qr-camera');
  // listar cameras (uma vez)
  if (!camSel.dataset.loaded){
    const devices = await Html5Qrcode.getCameras();
    camSel.innerHTML = devices.map(d => `<option value="${d.id}">${d.label || d.id}</option>`).join('');
    camSel.dataset.loaded = '1';
  }

  const cameraId = document.getElementById('qr-camera').value;
  const el = document.getElementById('qr-reader');
  qrInstance = new Html5Qrcode(el.id);
  await qrInstance.start(
    cameraId,
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      const cpf = (decodedText.match(/\d/g) || []).join('').slice(0, 11);
      if (cpf.length === 11){
        fillCpfAndConsult(cpf);
      }
    },
    () => {}
  );
  qrActive = true;
  setModeBadge('qr');
}

async function stopQrMode(){
  if (!qrActive) return;
  try { await qrInstance.stop(); } catch(_){ }
  try { await qrInstance.clear(); } catch(_){ }
  qrInstance = null; qrActive = false;
}

function fillCpfAndConsult(cpfDigits){
  const cpfInput = document.getElementById('cpf');
  // aplica máscara simples
  const d = cpfDigits;
  cpfInput.value = `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9,11)}`;
  onConsultar();
}

// hooks de UI
function wireReadersUI(){
  document.getElementById('mode-manual').addEventListener('change', e => e.target.checked && enableManualMode());
  document.getElementById('mode-wedge').addEventListener('change',  e => e.target.checked && startWedgeMode());
  document.getElementById('mode-qr').addEventListener('change',     e => e.target.checked && enableManualMode()); // mostra controles no botão
  document.getElementById('qr-start').addEventListener('click', startQrMode);
  document.getElementById('qr-stop') .addEventListener('click', stopQrMode);
  document.getElementById('mode-qr').addEventListener('change', (e)=>{
    if (e.target.checked){ document.getElementById('qr-controls').classList.remove('hidden'); setModeBadge('qr (parado)'); }
  });
}

function sanitizeCPF(str=""){
  return (str.match(/\d/g) || []).join('').slice(0,11);
}
function maskCPF(el){
  el.addEventListener('input', () => {
    const d = sanitizeCPF(el.value);
    let out = d;
    if (d.length > 3)  out = d.slice(0,3) + '.' + d.slice(3);
    if (d.length > 6)  out = out.slice(0,7) + '.' + out.slice(7);
    if (d.length > 9)  out = out.slice(0,11) + '-' + out.slice(11);
    el.value = out;
  });
}

function parseMoneyToNumber(str=""){
  // remove R$, espaços e tudo que não for dígito, vírgula ou ponto
  str = String(str).replace(/[^0-9.,-]/g, '').replace(/\s+/g,'');
  // remove milhares (pontos), usa vírgula como decimal
  str = str.replace(/\./g, '').replace(',', '.');
  const n = Number(str);
  return Number.isFinite(n) ? n : NaN;
}

function formatMoneyForInput(n){
  // devolve "1.234,56" (sem "R$")
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n)||0);
}

function formatBRL(n){
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n)||0);
}

valorEl.addEventListener('input', () => {
  // permite dígitos e UMA vírgula
  let v = valorEl.value;
  v = v.replace(/[^0-9,]/g, '');
  const i = v.indexOf(',');
  if (i !== -1) {
    v = v.slice(0, i + 1) + v.slice(i + 1).replace(/,/g, ''); // mantém só a primeira vírgula
    const parts = v.split(',');
    if (parts[1]?.length > 2) v = parts[0] + ',' + parts[1].slice(0,2);
  }
  valorEl.value = v;
});

valorEl.addEventListener('blur', () => {
  const n = parseMoneyToNumber(valorEl.value);
  if (Number.isFinite(n) && n >= 0) valorEl.value = formatMoneyForInput(n);
});

valorEl.addEventListener('focus', () => {
  // mantém como está; o usuário edita sem “pular” cursor
});

function getValorNumber(){ return parseMoneyToNumber(valorEl.value); }

function showToast(type, msg){
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role','status');
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
function setLoading(btn, isLoading){
  if (isLoading){
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
async function checkApiStatus(){
  try{
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2000);
    const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    setStatusDot(res.ok ? 'ok' : 'warn');
  } catch {
    setStatusDot('down');
  }
}
function setStatusDot(state){
  const dot = document.getElementById('api-status');
  dot.className = 'status-dot ' + (state==='ok'?'status-dot--ok':state==='warn'?'status-dot--warn':'status-dot--down');
}

function renderResultado(data, { showFinance=false } = {}){
  document.getElementById('out-nome').textContent   = data?.nome ?? '—';
  document.getElementById('out-plano').textContent  = data?.plano ?? '—';
  document.getElementById('out-status').textContent = data?.statusPagamento ?? '—';
  document.getElementById('out-venc').textContent   = data?.vencimento ?? '—';

  const rowDesc  = document.getElementById('row-desc');
  const rowValor = document.getElementById('row-valor');
  if (showFinance){
    rowDesc.classList.remove('hidden');
    rowValor.classList.remove('hidden');
    const desc = Number(data?.descontoAplicado);
    const vf   = Number(data?.valorFinal);
    document.getElementById('out-desc').textContent  = Number.isFinite(desc) ? `${desc}%` : '—';
    document.getElementById('out-valor').textContent = Number.isFinite(vf)   ? formatBRL(vf) : '—';
  } else {
    rowDesc.classList.add('hidden');
    rowValor.classList.add('hidden');
    document.getElementById('out-desc').textContent  = '—';
    document.getElementById('out-valor').textContent = '—';
  }
}

function renderTxMeta(data){
  const elRow = document.getElementById('row-tx');
  const elOut = document.getElementById('out-tx');
  if (data && data.id){
    const dt = new Date(data.created_at || Date.now()).toLocaleString('pt-BR');
    elOut.textContent = `#${data.id} · ${dt}`;
    elRow.classList.remove('hidden');
  } else {
    elOut.textContent = '';
    elRow.classList.add('hidden');
  }
}

async function onConsultar(e){
  e?.preventDefault?.();
  const cpf = sanitizeCPF(cpfInput.value);
  if (cpf.length !== 11) return showToast('error','CPF inválido');
  const valorNum = getValorNumber();

  setLoading(document.getElementById('btn-consultar'), true);
  try{
    let data;
    if (Number.isFinite(valorNum) && valorNum > 0){
      const res = await fetch(`${API_BASE}/transacao/preview?cpf=${cpf}&valor=${valorNum}`);
      if (!res.ok) throw new Error(res.status===404?'Cliente não encontrado':'Falha na simulação');
      data = await res.json();
      renderResultado(data, { showFinance:true });
    } else {
      const res = await fetch(`${API_BASE}/assinaturas?cpf=${cpf}`);
      if (!res.ok) throw new Error(res.status===404?'Cliente não encontrado':'Falha na consulta');
      data = await res.json();
      renderResultado(data, { showFinance:false });
    }
    renderTxMeta({});
  } catch(err){
    showToast('error', err.message || 'Erro ao consultar');
  } finally {
    setLoading(document.getElementById('btn-consultar'), false);
  }
}

async function onRegistrar(e){
  e?.preventDefault?.();
  const cpf = sanitizeCPF(cpfInput.value);
  const valor = getValorNumber();
  if (cpf.length !== 11) return showToast('error','CPF inválido');
  if (!Number.isFinite(valor) || valor <= 0) return showToast('error','Informe um valor válido');

  setLoading(document.getElementById('btn-registrar'), true);
  try{
    const res = await fetch(`${API_BASE}/transacao`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cpf, valor })
    });
    if (!res.ok) throw new Error('Erro ao registrar');
    const data = await res.json();
    renderResultado(data, { showFinance:true });
    const horaLocal = new Date(data.created_at || Date.now()).toLocaleString('pt-BR');
    showToast('success', `Transação #${data.id} registrada às ${horaLocal}`);
    renderTxMeta(data);
  } catch(err){
    showToast('error', err.message || 'Falha ao registrar');
  } finally {
    setLoading(document.getElementById('btn-registrar'), false);
  }
}

function init(){
  maskCPF(cpfInput);
  document.getElementById('btn-consultar').addEventListener('click', onConsultar);
  document.getElementById('btn-registrar').addEventListener('click', onRegistrar);
  document.addEventListener('keydown', (e) => {
    if (wedgeActive && wedgeBuffer) return;
    if (e.key === 'Enter' && e.ctrlKey) { onRegistrar(e); }
    else if (e.key === 'Enter') { onConsultar(e); }
  });
  wireReadersUI();
  checkApiStatus();
}

document.addEventListener('DOMContentLoaded', init);
