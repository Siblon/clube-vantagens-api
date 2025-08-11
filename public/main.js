const API_BASE = window.API_BASE || '';

const cpfEl = document.getElementById('cpf');
const cpfInput = cpfEl;

// ===== Money Input PRO (pt-BR) =====
const money = (() => {
  const el = document.getElementById('valor');
  const fmt = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });

  function digitsOnly(s){ return (s || '').replace(/[^\d]/g,''); }
  function toNumberFromMasked(s){
    // aceita "1.234,56" ou "1234,56" ou "123456" (centavos implícitos)
    if(!s) return 0;
    s = s.toString().trim().replace(/\./g,'').replace(/\s/g,'').replace(/^R\$\s?/,'');
    // Se tem vírgula, trata casa decimal
    if(s.includes(',')){
      s = s.replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    // Sem vírgula → trata como centavos implícitos
    const digs = digitsOnly(s);
    if(!digs) return 0;
    const n = Number(digs) / 100;
    return Number.isFinite(n) ? n : 0;
  }
  function formatBR(n){
    if(!Number.isFinite(n)) n = 0;
    // retorna sem o "R$ " pois o prefixo é visual
    const parts = fmt.format(n).replace(/^R\$\s?/, '');
    return parts;
  }

  // caret-safe input
  el.addEventListener('beforeinput', (e)=>{
    // Permitir: números, apagar, mover, vírgula
    if(e.inputType === 'insertText'){
      const ch = e.data || '';
      if(!/[\d,\.]/.test(ch)) e.preventDefault();
    }
  });

  el.addEventListener('input', ()=>{
    // normaliza ponto → vírgula visual
    let raw = el.value.replace(/\./g,'').replace(',',',');
    // mantém somente dígitos e vírgula (uma só)
    const m = raw.match(/^\d{0,15}(?:,\d{0,2})?/);
    const cleaned = m ? m[0] : '';
    el.value = cleaned;
    el.dataset.numeric = String(toNumberFromMasked(el.value)); // guarda valor numérico
  });

  el.addEventListener('blur', ()=>{
    const n = toNumberFromMasked(el.value);
    el.value = formatBR(n);           // exibe 1.234,56
    el.dataset.numeric = String(n);
  });

  function get(){
    // retorna Number em reais. Se vazio, 0.
    const n = Number(el.dataset.numeric ?? toNumberFromMasked(el.value));
    return Number.isFinite(n) ? n : 0;
  }
  function set(n){
    el.value = formatBR(n);
    el.dataset.numeric = String(n);
  }
  return { get, set, el };
})();

// ===== CPF Mask & Guard =====
(function(){
  const el = document.getElementById('cpf');
  function digitsOnly(s){ return (s || '').replace(/\D/g,''); }
  function formatCPF(digs){
    // 000.000.000-00
    return digs
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2}).*/, '$1.$2.$3-$4');
  }
  el.addEventListener('input', ()=>{
    const pos = el.selectionStart;
    let d = digitsOnly(el.value).slice(0,11); // trava 11 dígitos
    const before = el.value;
    el.value = formatCPF(d);
    // tentativa simples de manter caret próximo ao fim em edições comuns
    if(document.activeElement === el){
      if(el.value.length > before.length) el.selectionStart = el.selectionEnd = pos + 1;
      else el.selectionStart = el.selectionEnd = Math.max(pos - 1, 0);
    }
  });
})();

function focusAndSelect(el){
  if(!el) return;
  el.focus();
  try{ el.select(); }
  catch(_){ if(el.setSelectionRange) el.setSelectionRange(0, el.value.length); }
}

function applyTheme(theme){
  const t = theme || localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}
function toggleTheme(){
  const current = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ---- Modo de entrada --------------------------------------------------------
let cvPrefs = {};
let wedgeActive = false;
let wedgeBuffer = '';
let wedgeTimer = null;
let wedgeConfig = { debounceMs:40, minLen:11, beep:true };
let qrInstance = null;
let qrActive = false;
let lastConsultOk = false;

function setModeBadge(text){ document.getElementById('mode-badge').textContent = 'modo: ' + text; }

const modeRadios = document.querySelectorAll('input[name="reader-mode"]');
const cpfHint = document.getElementById('cpf-hint');

function attachWedge(){ if(wedgeActive) return; wedgeActive = true; wedgeBuffer = ''; window.addEventListener('keydown', wedgeKeydown, true); }
function detachWedge(){ if(!wedgeActive) return; wedgeActive = false; wedgeBuffer = ''; window.removeEventListener('keydown', wedgeKeydown, true); }

function configureWedge({debounceMs=40, minLen=11, beep=true}={}){
  wedgeConfig = { debounceMs:Number(debounceMs)||0, minLen:Number(minLen)||0, beep:!!beep };
}

function setReaderMode(mode){
  modeRadios.forEach(r => { r.checked = r.value === mode; });
  if(mode==='manual'){
    detachWedge();
    stopQrMode();
    document.getElementById('qr-controls').classList.add('hidden');
    cpfEl.readOnly = false;
    cpfHint.textContent = 'Digite 11 dígitos (modo manual) ou use o leitor/QR.';
    setModeBadge('manual');
  }
  if(mode==='wedge'){
    stopQrMode();
    document.getElementById('qr-controls').classList.add('hidden');
    cpfEl.readOnly = true;
    attachWedge();
    cpfHint.textContent = 'Modo leitor: bipar a etiqueta do CPF/ID.';
    setModeBadge('leitor');
  }
  if(mode==='qr'){
    cpfEl.readOnly = true;
    detachWedge();
    document.getElementById('qr-controls').classList.remove('hidden');
    cpfHint.textContent = 'Modo QR: a leitura será feita pela câmera.';
    setModeBadge(qrActive ? 'qr' : 'qr (parado)');
  }
  cvPrefs.readerMode = mode;
}

function wedgeKeydown(e){
  const target = e.target;
  const editable = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');
  if (editable && target.id !== 'cpf') return;

  if (/^[0-9A-Za-z]$/.test(e.key)) {
    wedgeBuffer += e.key;
    if (wedgeTimer) clearTimeout(wedgeTimer);
    wedgeTimer = setTimeout(() => {
      const payload = wedgeBuffer;
      wedgeBuffer = '';
      if (payload.length >= wedgeConfig.minLen) onScanPayload(payload);
    }, wedgeConfig.debounceMs);
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (wedgeTimer) clearTimeout(wedgeTimer);
    const payload = wedgeBuffer;
    wedgeBuffer = '';
    if (payload.length >= wedgeConfig.minLen) onScanPayload(payload);
  } else {
    wedgeBuffer = '';
  }
}

async function startQrMode(){
  detachWedge();
  document.getElementById('qr-controls').classList.remove('hidden');
  if (qrActive) return;

  const camSel = document.getElementById('qr-camera');
  // listar cameras (uma vez)
  if (!camSel.dataset.loaded){
    const devices = await Html5Qrcode.getCameras();
    camSel.innerHTML = devices.map(d => `<option value="${d.id}">${d.label || d.id}</option>`).join('');
    camSel.dataset.loaded = '1';
  }
  camSel.value = cvPrefs.qrCameraId || camSel.value;

  const cameraId = camSel.value;
  const el = document.getElementById('qr-reader');
  qrInstance = new Html5Qrcode(el.id);
  await qrInstance.start(
    cameraId,
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      onScanPayload(decodedText);
    },
    () => {}
  );
  qrActive = true;
  setModeBadge('qr');
}

async function stopQrMode(){
  if (!qrActive){ setModeBadge('qr (parado)'); return; }
  try { await qrInstance.stop(); } catch(_){ }
  try { await qrInstance.clear(); } catch(_){ }
  qrInstance = null; qrActive = false;
  setModeBadge('qr (parado)');
}

async function onScanPayload(str){
  const raw = String(str || '').toUpperCase();
  const digits = raw.replace(/\D+/g,'');
  const idRegex = new RegExp(cvPrefs.idPattern || '^C\\d{7}$', 'i');
  let ident = '';
  if (digits.length >= cvPrefs.scanMinLength && digits.length === 11) ident = digits;
  else if (idRegex.test(raw)) ident = raw;
  if (!ident) {
    showToast({type:'error', text:'Código inválido'});
    return;
  }
  if (digits.length === 11) {
    cpfEl.value = `${ident.slice(0,3)}.${ident.slice(3,6)}.${ident.slice(6,9)}-${ident.slice(9,11)}`;
  } else {
    cpfEl.value = ident;
  }
  focusAndSelect(cpfEl);
  window.dispatchEvent(new CustomEvent('scan', { detail: ident }));
  if (cvPrefs.beepOnScan) Settings.beep();
  if (cvPrefs.autoConsultOnScan){
    const ret = onConsultar();
    if (cvPrefs.autoRegisterAfterConsult){
      if (ret && typeof ret.then === 'function'){
        ret.then(() => { if (lastConsultOk) onRegistrar(); });
      } else {
        if (lastConsultOk) onRegistrar();
      }
    }
  }
}

function parseIdent(str = "") {
  const raw = String(str).trim().toUpperCase();
  const digits = (raw.match(/\d/g) || []).join('');
  if (/^\d{11}$/.test(digits)) return { cpf: digits };
  const idRegex = new RegExp(cvPrefs.idPattern || '^C\\d{7}$', 'i');
  if (idRegex.test(raw)) return { id: raw };
  return {};
}

function formatBRL(n){
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n)||0);
}

// ===== Integração no fluxo já existente =====
// Onde enviamos o POST /transacao ou preview, substituir a coleta do valor:
function getValorNumero(){ return money.get(); } // em reais como Number

// Dica: se precisar zerar o campo após registrar e a preferência estiver marcada:
function limparValorSeNecessario(){
  // exemplo de uso onde já tratamos prefs
  // money.set(0);
}

function showToast({type='info', text=''}){
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role','status');
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
function setBtnLoading(btn, isLoading){
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
function setLoading(isLoading){
  const card = document.getElementById('resultado');
  if (isLoading){
    card.classList.add('skeleton');
  } else {
    card.classList.remove('skeleton');
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
  const sb = document.getElementById('status-badge');
  if(!sb) return;
  if(state==='ok'){
    sb.textContent = 'online';
    sb.dataset.status = 'online';
  }else{
    sb.textContent = 'instável';
    sb.dataset.status = 'warn';
  }
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
  const { cpf, id } = parseIdent(cpfInput.value);
  if (!cpf && !id) return showToast({type:'error', text:'Identificador inválido'});
  const valorNum = getValorNumero();

  setLoading(true);
  setBtnLoading(document.getElementById('btn-consultar'), true);
  try{
    let data;
    const identParam = cpf ? `cpf=${cpf}` : `id=${id}`;
    if (Number.isFinite(valorNum) && valorNum > 0){
      const res = await fetch(`${API_BASE}/transacao/preview?${identParam}&valor=${valorNum}`);
      if (!res.ok) throw new Error(res.status===404?'Cliente não encontrado':'Falha na simulação');
      data = await res.json();
      renderResultado(data, { showFinance:true });
    } else {
      const res = await fetch(`${API_BASE}/assinaturas?${identParam}`);
      if (!res.ok) throw new Error(res.status===404?'Cliente não encontrado':'Falha na consulta');
      data = await res.json();
      renderResultado(data, { showFinance:false });
    }
    renderTxMeta({});
    lastConsultOk = true;
  } catch(err){
    lastConsultOk = false;
    showToast({type:'error', text: err.message || 'Erro ao consultar'});
  } finally {
    setBtnLoading(document.getElementById('btn-consultar'), false);
    setLoading(false);
    if (lastConsultOk && cvPrefs.focusValueAfterConsult) focusAndSelect(money.el);
  }
}

async function onRegistrar(e){
  e?.preventDefault?.();
  const { cpf, id } = parseIdent(cpfInput.value);
  const valor = getValorNumero();
  if (!cpf && !id) return showToast({type:'error', text:'Identificador inválido'});
  if (!Number.isFinite(valor) || valor <= 0) return showToast({type:'error', text:'Informe um valor válido'});

  setLoading(true);
  setBtnLoading(document.getElementById('btn-registrar'), true);
  try{
    const body = { valor };
    if (cpf) body.cpf = cpf; else body.id = id;
    const res = await fetch(`${API_BASE}/transacao`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error('Erro ao registrar');
    const data = await res.json();
    renderResultado(data, { showFinance:true });
    const horaLocal = new Date(data.created_at || Date.now()).toLocaleString('pt-BR');
    showToast({type:'success', text:`Transação #${data.id} registrada às ${horaLocal}`});
    renderTxMeta(data);
    if (cvPrefs.clearCpfAfterRegister) cpfEl.value = '';
    if (!cvPrefs.keepValueAfterRegister) money.set(0);
  } catch(err){
    showToast({type:'error', text: err.message || 'Falha ao registrar'});
  } finally {
    setBtnLoading(document.getElementById('btn-registrar'), false);
    setLoading(false);
  }
}

function fillSettingsForm(p){
  document.getElementById('pref-readerMode').value = p.readerMode;
  document.getElementById('pref-autoConsultOnScan').checked = !!p.autoConsultOnScan;
  document.getElementById('pref-autoRegisterAfterConsult').checked = !!p.autoRegisterAfterConsult;
  document.getElementById('pref-focusValueAfterConsult').checked = !!p.focusValueAfterConsult;
  document.getElementById('pref-beepOnScan').checked = !!p.beepOnScan;
  document.getElementById('pref-clearCpfAfterRegister').checked = !!p.clearCpfAfterRegister;
  document.getElementById('pref-keepValueAfterRegister').checked = !!p.keepValueAfterRegister;
  document.getElementById('pref-qrCameraId').value = p.qrCameraId || '';
  document.getElementById('pref-wedgeDebounceMs').value = p.wedgeDebounceMs;
  document.getElementById('pref-scanMinLength').value = p.scanMinLength;
  document.getElementById('pref-idPattern').value = p.idPattern;
}

async function openSettingsDialog(){
  const prefs = Settings.load();
  cvPrefs = prefs;
  fillSettingsForm(prefs);
  const sel = document.getElementById('pref-qrCameraId');
  const devices = await Settings.enumerateCameras();
  sel.innerHTML = '<option value="">Padrão do navegador</option>' + devices.map(d=>`<option value="${d.deviceId}">${d.label || d.deviceId}</option>`).join('');
  sel.value = prefs.qrCameraId || '';
  document.getElementById('settingsDialog').showModal();
}

function onSettingsSubmit(e){
  e.preventDefault();
  const prefs = {
    readerMode: document.getElementById('pref-readerMode').value,
    autoConsultOnScan: document.getElementById('pref-autoConsultOnScan').checked,
    autoRegisterAfterConsult: document.getElementById('pref-autoRegisterAfterConsult').checked,
    focusValueAfterConsult: document.getElementById('pref-focusValueAfterConsult').checked,
    beepOnScan: document.getElementById('pref-beepOnScan').checked,
    clearCpfAfterRegister: document.getElementById('pref-clearCpfAfterRegister').checked,
    keepValueAfterRegister: document.getElementById('pref-keepValueAfterRegister').checked,
    qrCameraId: document.getElementById('pref-qrCameraId').value,
    wedgeDebounceMs: Number(document.getElementById('pref-wedgeDebounceMs').value)||0,
    scanMinLength: Number(document.getElementById('pref-scanMinLength').value)||0,
    idPattern: document.getElementById('pref-idPattern').value || '^C\\d{7}$'
  };
  Settings.save(prefs);
  Settings.apply(prefs);
  cvPrefs = prefs;
  fillSettingsForm(prefs);
  document.getElementById('settingsDialog').close();
}

function init(){
  applyTheme();
  document.getElementById('btn-appearance').addEventListener('click', (e)=>{ e.preventDefault(); toggleTheme(); });
  document.getElementById('btn-consultar').addEventListener('click', onConsultar);
  document.getElementById('btn-registrar').addEventListener('click', onRegistrar);
  document.addEventListener('keydown', (e) => {
    if (wedgeActive && wedgeBuffer) return;
    if (e.key === 'Enter' && e.ctrlKey) { onRegistrar(e); }
    else if (e.key === 'Enter') { onConsultar(e); }
  });

  cvPrefs = Settings.load();
  Settings.apply(cvPrefs);

  modeRadios.forEach(r=> r.addEventListener('change', ()=>{ if(r.checked){ setReaderMode(r.value); Settings.save(cvPrefs); } }));

  document.getElementById('qr-camera').addEventListener('change', (e)=>{ cvPrefs.qrCameraId = e.target.value; Settings.save(cvPrefs); });
  document.getElementById('qr-start').addEventListener('click', startQrMode);
  document.getElementById('qr-stop').addEventListener('click', stopQrMode);

  document.getElementById('btn-reset-prefs').addEventListener('click', () => {
    Settings.save(Settings.defaults);
    Settings.apply(Settings.defaults);
    cvPrefs = Settings.defaults;
    fillSettingsForm(Settings.defaults);
  });
  document.getElementById('settingsForm').addEventListener('submit', onSettingsSubmit);
  document.getElementById('btn-test-wedge').addEventListener('click', () => {
    const out = document.getElementById('test-output');
    out.textContent = 'Aguardando...';
    const handler = ev => { out.textContent = ev.detail; window.removeEventListener('scan', handler); };
    window.addEventListener('scan', handler);
    setReaderMode('wedge');
  });
  document.getElementById('btn-test-qr').addEventListener('click', () => {
    const out = document.getElementById('test-output');
    out.textContent = 'Aguardando...';
    const handler = ev => { out.textContent = ev.detail; window.removeEventListener('scan', handler); stopQrMode(); };
    window.addEventListener('scan', handler);
    setReaderMode('qr');
    startQrMode();
  });

  checkApiStatus();
}

document.addEventListener('DOMContentLoaded', init);

// Focus-trap e ESC para o dialog de configurações
(function(){
  const dlg = document.getElementById('settingsDialog');
  const closeBtns = [document.getElementById('btn-close-settings'), document.getElementById('btn-close-settings-footer')].filter(Boolean);
  closeBtns.forEach(b => b && b.addEventListener('click', () => dlg.close()));

  document.getElementById('btn-settings')?.addEventListener('click', async () =>{
    await openSettingsDialog();
    // foco inicial no primeiro control
    const first = dlg.querySelector('select, input, button');
    if(first) setTimeout(()=>first.focus(), 0);
  });

  dlg.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape'){ e.preventDefault(); dlg.close(); }
    if(e.key === 'Tab'){
      // trap simples
      const focusables = dlg.querySelectorAll('a,button,select,input,textarea,[tabindex]:not([tabindex="-1"])');
      const list = Array.from(focusables).filter(el=>!el.disabled && el.offsetParent !== null);
      if(list.length === 0) return;
      const first = list[0], last = list[list.length-1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
})();
