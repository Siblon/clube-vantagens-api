// === Settings (moved from settings.js) ===
const DEFAULTS = {
  "readerMode": "wedge",
  "autoConsultOnScan": true,
  "autoRegisterAfterConsult": false,
  "focusValueAfterConsult": true,
  "beepOnScan": true,
  "clearCpfAfterRegister": true,
  "keepValueAfterRegister": false,
  "qrCameraId": "",
  "wedgeDebounceMs": 40,
  "scanMinLength": 11,
  "idPattern": "^C\\d{7}$"
};

const Settings = {
  defaults: DEFAULTS,
  load(){
    try{
      const raw = localStorage.getItem('cv_prefs_v1');
      const obj = raw ? JSON.parse(raw) : {};
      return { ...DEFAULTS, ...obj };
    }catch(_){
      return { ...DEFAULTS };
    }
  },
  save(prefs){
    try{ localStorage.setItem('cv_prefs_v1', JSON.stringify(prefs)); }catch(_){ }
  },
  apply(prefs){
    const p = { ...DEFAULTS, ...prefs };
    window.cvPrefs = p;
    if (window.setReaderMode) window.setReaderMode(p.readerMode);
    if (window.configureWedge) window.configureWedge({ debounceMs: p.wedgeDebounceMs, minLen: p.scanMinLength, beep: p.beepOnScan });
  },
  async enumerateCameras(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'videoinput');
    }catch(_){
      return [];
    }
  },
  beep(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }catch(_){ }
  }
};

window.Settings = Settings;

// === UI helpers (moved from ui.js) ===
(() => {
  const NAV = [
    { id:'painel',      href:'/',                label:'Painel' },
    { id:'relatorios',  href:'/relatorios.html', label:'Relatórios' },
    { id:'etiquetas',   href:'/etiquetas.html',  label:'Etiquetas' },
    { id:'leads',       href:'/leads-admin.html',label:'Leads (Admin)' },
    { id:'clientes',    href:'/clientes-admin.html',label:'Clientes (Admin)' },
    { id:'config',      href:'/config.html',     label:'Config' }
  ];

  const ls = window.localStorage;
  function getPin(){ return ls.getItem('adminPin') || ''; }
  function setPin(v){ v ? ls.setItem('adminPin', v) : ls.removeItem('adminPin'); }
  async function adminFetch(url, opts = {}){
    const pin = getPin();
    const headers = new Headers(opts.headers || {});
    if(pin) headers.set('x-admin-pin', pin);
    return fetch(url, { ...opts, headers });
  }

  async function pingStatus(el){
    try{
      const r = await fetch('/health', { cache:'no-store' });
      const ok = r.ok;
      el.textContent = ok ? 'online' : 'instável';
      el.dataset.status = ok ? 'online' : 'warn';
      return ok;
    }catch(_){
      el.textContent = 'instável';
      el.dataset.status = 'warn';
      return false;
    }
  }

  function mountChrome({ active } = {}){
    const top = document.getElementById('topbar') || (() => {
      const h = document.createElement('header');
      h.id='topbar';
      document.body.prepend(h);
      return h;
    })();
    const foot = document.getElementById('site-footer') || (() => {
      const f = document.createElement('footer');
      f.id='site-footer';
      document.body.append(f);
      return f;
    })();

    top.innerHTML = `
      <div class="topbar">
        <div class="brand">
          <span class="dot"></span>
          <a class="brand-title" href="/">Clube de Vantagens</a>
        </div>
        <nav class="mainnav" aria-label="Principal">
          ${NAV.map(n=>`<a data-id="${n.id}" href="${n.href}">${n.label}</a>`).join('')}
        </nav>
        <div class="tools">
          <span id="status-badge" class="badge">instável</span>
          <a class="btn btn--ghost" href="#" id="btn-appearance">⚙ Aparência</a>
          <a class="btn btn--ghost" href="/config.html">⚙ Configurações</a>
        </div>
      </div>
    `;
    top.querySelectorAll('.mainnav a').forEach(a=>{
      if(a.dataset.id === active) a.classList.add('active');
    });

    const sb = document.getElementById('status-badge');
    pingStatus(sb);

    foot.innerHTML = `<div class="footer">v0.1.0 — Ambiente de Teste — Loja X</div>`;

    document.addEventListener('keydown', (e)=>{
      if(e.key==='/' && !e.target.closest('input,textarea')){
        const first = document.querySelector('input');
        if(first) first.focus();
        e.preventDefault();
      }
    });
  }

  function pinControls(container){
    container.innerHTML = `
      <div class="pinrow">
        <label for="pin-admin">PIN admin</label>
        <div class="pinbox">
          <input id="pin-admin" type="password" class="input" placeholder="****" value="${getPin()}" />
          <button id="pin-toggle" class="btn btn--ghost" type="button" title="Mostrar/ocultar">👁</button>
          <button id="pin-validate" class="btn btn--secondary" type="button">Validar PIN</button>
          <span id="pin-status" class="badge badge--muted">aguardando</span>
        </div>
      </div>
    `;
    const input = container.querySelector('#pin-admin');
    const toggle = container.querySelector('#pin-toggle');
    const btn = container.querySelector('#pin-validate');
    const b = container.querySelector('#pin-status');

    toggle.addEventListener('click', ()=>{
      input.type = input.type === 'password' ? 'text':'password';
    });
    input.addEventListener('change', ()=> setPin(input.value.trim()));
    btn.addEventListener('click', async ()=>{
      setPin(input.value.trim());
      b.textContent = 'validando...';
      b.className = 'badge';
      try{
        const r = await adminFetch('/admin/status/ping-supabase');
        const ok = r.ok;
        b.textContent = ok ? 'válido' : 'inválido';
        b.className = 'badge ' + (ok ? 'badge--ok':'badge--warn');
      }catch(_){
        b.textContent = 'erro';
        b.className = 'badge badge--warn';
      }
    });
  }

  window.UI = { mountChrome, pinControls, adminFetch, getPin, setPin };
})();

const API_BASE = window.API_BASE || '';

let cpfEl, cpfInput, money;
let modeRadios = [];
let cpfHint, cpfHintDefault;
let btnRegistrar;

async function api(path, opts={}) {
  const r = await fetch(path, { headers:{ 'Content-Type':'application/json' }, ...opts });
  if (!r.ok) {
    let m = 'Falha na requisição';
    try { const j = await r.json(); if (j?.error) m = j.error; } catch {}
    throw new Error(m);
  }
  return r.json();
}

function setupMoneyInput(el){
  if(!el){ console.warn('Elemento faltando: #valor'); return { get:()=>0, set:()=>{}, el:null }; }
  const fmt = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });

  function digitsOnly(s){ return (s || '').replace(/[^\d]/g,''); }
  function toNumberFromMasked(s){
    if(!s) return 0;
    s = s.toString().trim().replace(/\./g,'').replace(/\s/g,'').replace(/^R\$\s?/,'');
    if(s.includes(',')){
      s = s.replace(',', '.');
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    }
    const digs = digitsOnly(s);
    if(!digs) return 0;
    const n = Number(digs) / 100;
    return Number.isFinite(n) ? n : 0;
  }
  function formatBR(n){
    if(!Number.isFinite(n)) n = 0;
    const parts = fmt.format(n).replace(/^R\$\s?/, '');
    return parts;
  }

  el.addEventListener('beforeinput', (e)=>{
    if(e.inputType === 'insertText'){
      const ch = e.data || '';
      if(!/[\d,\.]/.test(ch)) e.preventDefault();
    }
  });

  el.addEventListener('input', ()=>{
    let raw = el.value.replace(/\./g,'').replace(',',',');
    const m = raw.match(/^\d{0,15}(?:,\d{0,2})?/);
    const cleaned = m ? m[0] : '';
    el.value = cleaned;
    el.dataset.numeric = String(toNumberFromMasked(el.value));
  });

  el.addEventListener('blur', ()=>{
    const n = toNumberFromMasked(el.value);
    el.value = formatBR(n);
    el.dataset.numeric = String(n);
  });

  function get(){
    const n = Number(el.dataset.numeric ?? toNumberFromMasked(el.value));
    return Number.isFinite(n) ? n : 0;
  }
  function set(n){
    el.value = formatBR(n);
    el.dataset.numeric = String(n);
  }
  return { get, set, el };
}

function setupCpfMask(el){
  if(!el){ console.warn('Elemento faltando: #cpf'); return; }
  function digitsOnly(s){ return (s || '').replace(/\D/g,''); }
  function formatCPF(d){
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  el.addEventListener('input', ()=>{
    const digits = digitsOnly(el.value).slice(0,11);
    const formatted = formatCPF(digits);
    el.value = formatted;
    const pos = formatted.length;
    el.setSelectionRange(pos, pos);
  });
  el.addEventListener('keydown', (e)=>{
    const allowed = ['Backspace','ArrowLeft','ArrowRight','Delete','Tab','Enter','Home','End'];
    if(digitsOnly(el.value).length >= 11 && !allowed.includes(e.key) && !(e.ctrlKey || e.metaKey)){
      e.preventDefault();
    }
  });
}

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
let lastPreviewOk = false;
let lastConsultCpf = '';

function setModeBadge(text){
  const el = document.getElementById('mode-badge');
  if (el) el.textContent = 'modo: ' + text;
}

function attachWedge(){ if(wedgeActive) return; wedgeActive = true; wedgeBuffer = ''; window.addEventListener('keydown', wedgeKeydown, true); }
function detachWedge(){ if(!wedgeActive) return; wedgeActive = false; wedgeBuffer = ''; window.removeEventListener('keydown', wedgeKeydown, true); }

function configureWedge({debounceMs=40, minLen=11, beep=true}={}){
  wedgeConfig = { debounceMs:Number(debounceMs)||0, minLen:Number(minLen)||0, beep:!!beep };
}

function setReaderMode(mode){
  modeRadios.forEach(r => { r.checked = r.value === mode; });
  const qrCtrl = document.getElementById('qr-controls');
  if(mode==='manual'){
    detachWedge();
    stopQrMode();
    qrCtrl?.classList.add('hidden');
    if(cpfEl) cpfEl.readOnly = false;
    if(cpfHint) cpfHint.textContent = 'Digite 11 dígitos (modo manual) ou use o leitor/QR.';
    setModeBadge('manual');
  }
  if(mode==='wedge'){
    stopQrMode();
    qrCtrl?.classList.add('hidden');
    if(cpfEl) cpfEl.readOnly = true;
    attachWedge();
    if(cpfHint) cpfHint.textContent = 'Modo leitor: bipar a etiqueta do CPF/ID.';
    setModeBadge('leitor');
  }
  if(mode==='qr'){
    if(cpfEl) cpfEl.readOnly = true;
    detachWedge();
    qrCtrl?.classList.remove('hidden');
    if(cpfHint) cpfHint.textContent = 'Modo QR: a leitura será feita pela câmera.';
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
  document.getElementById('qr-controls')?.classList.remove('hidden');
  if (qrActive) return;

  const camSel = document.getElementById('qr-camera');
  if(!camSel){ console.warn('Elemento faltando: #qr-camera'); return; }
  // listar cameras (uma vez)
  if (!camSel.dataset.loaded){
    const devices = await Html5Qrcode.getCameras();
    camSel.innerHTML = devices.map(d => `<option value="${d.id}">${d.label || d.id}</option>`).join('');
    camSel.dataset.loaded = '1';
  }
  camSel.value = cvPrefs.qrCameraId || camSel.value;

  const cameraId = camSel.value;
  const el = document.getElementById('qr-reader');
  if(!el){ console.warn('Elemento faltando: #qr-reader'); return; }
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
        ret.then(() => { if (lastConsultOk) registrar(); });
      } else {
        if (lastConsultOk) registrar();
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
function parseCurrencyBR(str) {
  if (!str) return 0;
  const s = String(str).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function getValorNumero(){ return parseCurrencyBR(money?.el?.value); } // em reais como Number

function getCpf(){
  const digits = cpfEl?.value?.replace(/\D/g,'');
  return digits && digits.length === 11 ? digits : '';
}

function getValorBRL(){
  return money?.get ? money.get() : 0;
}

// Dica: se precisar zerar o campo após registrar e a preferência estiver marcada:
function limparValorSeNecessario(){
  // exemplo de uso onde já tratamos prefs
  // money.set(0);
}

function showToast(msg){
  if(typeof msg === 'string') msg = { text: msg };
  const { type='info', text='' } = msg || {};
  const container = document.getElementById('toasts');
  if(!container){ console.warn('Elemento faltando: #toasts'); return; }
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.setAttribute('role','status');
  toast.textContent = text;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
function setBtnLoading(btn, isLoading){
  if (!btn){ console.warn('Elemento faltando em setBtnLoading'); return; }
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
  if(!card){ console.warn('Elemento faltando: #resultado'); return; }
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
  const nameEl   = document.getElementById('out-name');
  const planoEl  = document.getElementById('out-plano');
  const statusEl = document.getElementById('out-status');
  const vencEl   = document.getElementById('out-venc');
  if(nameEl)   nameEl.textContent   = data?.nome ?? '—';
  else console.warn('Elemento faltando: #out-name');
  if(planoEl)  planoEl.textContent  = data?.plano ?? '—';
  else console.warn('Elemento faltando: #out-plano');
  if(statusEl) statusEl.textContent = data?.statusPagamento ?? '—';
  else console.warn('Elemento faltando: #out-status');
  if(vencEl)   vencEl.textContent   = data?.vencimento ?? '—';
  else console.warn('Elemento faltando: #out-venc');

  const rowDesc  = document.getElementById('row-desc');
  const rowValor = document.getElementById('row-valor');
  if (showFinance){
    rowDesc?.classList.remove('hidden');
    rowValor?.classList.remove('hidden');
    const desc = Number(data?.descontoAplicado);
    const vf   = Number(data?.valorFinal);
    const outDescEl = document.getElementById('out-desc');
    const outValorEl = document.getElementById('out-valor');
    if(outDescEl) outDescEl.textContent  = Number.isFinite(desc) ? `${desc}%` : '—';
    if(outValorEl) outValorEl.textContent = Number.isFinite(vf)   ? formatBRL(vf) : '—';
  } else {
    rowDesc?.classList.add('hidden');
    rowValor?.classList.add('hidden');
    const outDescEl = document.getElementById('out-desc');
    const outValorEl = document.getElementById('out-valor');
    if(outDescEl) outDescEl.textContent  = '—';
    if(outValorEl) outValorEl.textContent = '—';
  }
}

function renderTxMeta(data){
  const elRow = document.getElementById('row-tx');
  const elOut = document.getElementById('out-tx');
  if(!elRow || !elOut){ console.warn('Elemento faltando: #row-tx ou #out-tx'); return; }
  if (data && data.id){
    const dt = new Date(data.created_at || Date.now()).toLocaleString('pt-BR');
    elOut.textContent = `#${data.id} · ${dt}`;
    elRow.classList.remove('hidden');
  } else {
    elOut.textContent = '';
    elRow.classList.add('hidden');
  }
}

function resetResumo(){
  renderResultado(null, { showFinance:false });
  renderTxMeta({});
  lastPreviewOk = false;
  btnRegistrar?.setAttribute('disabled', 'true');
}

function renderPreview(j){
  if(j){
    const c = j.cliente || {};
    renderResultado({
      nome: c.nome,
      plano: c.plano,
      statusPagamento: c.statusPagamento || c.status,
      vencimento: c.vencimento,
      descontoAplicado: j.descontoPercent,
      valorFinal: j.valorFinal
    }, { showFinance:true });
  } else {
    renderResultado(null, { showFinance:false });
  }
}

async function atualizarPreview(){
  if (!lastConsultOk) { btnRegistrar && (btnRegistrar.disabled = true); return; }
  const cpf = getCpf();
  const valor = getValorBRL();
  if (!cpf || valor <= 0) { resetResumo(); return; }
  lastPreviewOk = false;
  if(btnRegistrar) btnRegistrar.disabled = true;
  const rowDesc  = document.getElementById('row-desc');
  const rowValor = document.getElementById('row-valor');
  rowDesc?.classList.add('hidden');
  rowValor?.classList.add('hidden');
  const outDescEl = document.getElementById('out-desc');
  const outValorEl = document.getElementById('out-valor');
  if(outDescEl) outDescEl.textContent = '—';
  if(outValorEl) outValorEl.textContent = '—';
  try {
    const j = await api(`/transacao/preview?cpf=${encodeURIComponent(cpf)}&valor=${encodeURIComponent(valor)}`);
    renderPreview(j);
    lastPreviewOk = true;
    if(btnRegistrar) btnRegistrar.disabled = false;
  } catch (e) {
    resetResumo();
    showToast(e.message || 'Não foi possível pré-visualizar');
  }
}

async function registrar(){
  if (!lastConsultOk || !lastPreviewOk){
    showToast('Consulte o cliente e aguarde o preview antes de registrar.');
    return;
  }
  try {
    const cpf = getCpf();
    const valor = getValorBRL();
    const tx = await api('/transacao', { method:'POST', body: JSON.stringify({ cpf, valor }) });
    if (tx?.id){
      try {
        const chk = await api('/mp/checkout', { method:'POST', body: JSON.stringify({ externalReference: tx.id }) });
        if (chk?.init_point) window.open(chk.init_point, '_blank');
      } catch(err){ console.warn('Falha ao iniciar pagamento', err); }
    }
    showToast('Registrado com sucesso!');
  } catch(e) {
    showToast(`Erro ao registrar: ${e.message}`);
  }
}

async function onConsultar(e){
  e?.preventDefault?.();
  const { cpf } = parseIdent(cpfInput.value);
  if (!cpf) return showToast({type:'error', text:'Identificador inválido'});
  const valorNum = getValorNumero();

  setLoading(true);
  setBtnLoading(document.getElementById('btn-consultar'), true);
  resetResumo();
  try{
    const res = await fetch(`${API_BASE}/assinaturas?cpf=${cpf}`);
    if(!res.ok){
      if(res.status === 404) throw new Error('Cliente não encontrado');
      const t = await res.text();
      throw new Error(`Falha na consulta (${res.status}): ${t}`);
    }
    const data = await res.json();
    renderResultado({
      nome: data.nome,
      plano: data.plano,
      statusPagamento: data.statusPagamento || data.status,
      vencimento: data.vencimento
    }, { showFinance:false });
    renderTxMeta({});
    lastConsultOk = true;
    lastConsultCpf = cpf;
    if (Number.isFinite(valorNum) && valorNum > 0){
      await atualizarPreview();
    }
  } catch(err){
    lastConsultOk = false;
    showToast({type:'error', text: err.message || 'Erro ao consultar'});
  } finally {
    setBtnLoading(document.getElementById('btn-consultar'), false);
    setLoading(false);
    if (lastConsultOk && cvPrefs.focusValueAfterConsult) focusAndSelect(money.el);
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
  const byId = (id) => document.getElementById(id);
  const on = (id, evt, handler) => {
    const el = byId(id);
    if(el) el.addEventListener(evt, handler);
    else console.warn(`Elemento faltando: #${id}`);
    return el;
  };

  if (window.UI && UI.mountChrome) UI.mountChrome({ active:'painel' });

  applyTheme();

  cpfEl = byId('cpf');
  if(!cpfEl) console.warn('Elemento faltando: #cpf');
  else setupCpfMask(cpfEl);
  cpfInput = cpfEl;
  cpfInput?.addEventListener('input', ()=>{ lastConsultOk = false; lastPreviewOk = false; lastConsultCpf = ''; resetResumo(); });

  const valorEl = byId('valor');
  money = setupMoneyInput(valorEl);
  if(money?.el) money.el.addEventListener('input', atualizarPreview);

  modeRadios = document.querySelectorAll('input[name="reader-mode"]');
  if(modeRadios.length === 0) console.warn('Elemento faltando: input[name="reader-mode"]');
  cpfHint = byId('cpf-hint');
  if(!cpfHint) console.warn('Elemento faltando: #cpf-hint');
  else cpfHintDefault = cpfHint.textContent;

  const btnAppearance = on('btn-appearance', 'click', (e)=>{ e.preventDefault(); toggleTheme(); });
  const btnConsultar = on('btn-consultar','click', onConsultar);
  btnRegistrar = document.querySelector('#btn-registrar');
  btnRegistrar?.addEventListener('click', registrar);
  btnRegistrar?.setAttribute('disabled','true');
  resetResumo();

  document.addEventListener('keydown', (e) => {
    if (wedgeActive && wedgeBuffer) return;
    if (e.key === 'Enter' && e.ctrlKey) { registrar(); }
    else if (e.key === 'Enter') { onConsultar(e); }
  });

  cvPrefs = Settings.load();
  Settings.apply(cvPrefs);

  modeRadios.forEach(r=> r.addEventListener('change', ()=>{ if(r.checked){ setReaderMode(r.value); Settings.save(cvPrefs); } }));

  on('qr-camera','change', (e)=>{ cvPrefs.qrCameraId = e.target.value; Settings.save(cvPrefs); });
  on('qr-start','click', startQrMode);
  on('qr-stop','click', stopQrMode);

  on('btn-reset-prefs','click', () => {
    Settings.save(Settings.defaults);
    Settings.apply(Settings.defaults);
    cvPrefs = Settings.defaults;
    fillSettingsForm(Settings.defaults);
  });
  on('settingsForm','submit', onSettingsSubmit);

  on('btn-test-wedge','click', () => {
    const out = byId('test-output');
    if(out) out.textContent = 'Aguardando...';
    const handler = ev => { if(out) out.textContent = ev.detail; window.removeEventListener('scan', handler); };
    window.addEventListener('scan', handler);
    setReaderMode('wedge');
  });
  on('btn-test-qr','click', () => {
    const out = byId('test-output');
    if(out) out.textContent = 'Aguardando...';
    const handler = ev => { if(out) out.textContent = ev.detail; window.removeEventListener('scan', handler); stopQrMode(); };
    window.addEventListener('scan', handler);
    setReaderMode('qr');
    startQrMode();
  });

  if(cpfEl){
    const toggleBtns = () => {
      const digits = cpfEl.value.replace(/\D/g,'');
      const valid = digits.length === 11;
      if(btnConsultar){
        btnConsultar.disabled = !valid;
        btnConsultar.title = valid ? '' : 'Informe um CPF com 11 dígitos';
      }
      if(btnRegistrar && !valid){
        btnRegistrar.disabled = true;
      }
      if(cpfHint){
        if(!valid && digits.length > 0){
          cpfHint.textContent = 'CPF inválido';
          cpfHint.classList.add('hint--error');
        }else{
          cpfHint.textContent = cpfHintDefault;
          cpfHint.classList.remove('hint--error');
        }
      }
    };
    cpfEl.addEventListener('input', () => { toggleBtns(); atualizarPreview(); });
    toggleBtns();
    atualizarPreview();
  }
  const dlg = byId('settingsDialog');
  if(dlg){
    ['btn-close-settings','btn-close-settings-footer'].forEach(id => {
      const b = byId(id);
      if(b) b.addEventListener('click', () => dlg.close());
      else console.warn(`Elemento faltando: #${id}`);
    });
    const el = document.querySelector('#btn-settings');
    if (el) {
      el.addEventListener('click', async () => {
        await openSettingsDialog();
        const first = dlg.querySelector('select, input, button');
        if(first) setTimeout(()=>first.focus(),0);
      });
    }
    dlg.addEventListener('keydown', (e)=>{
      if(e.key === 'Escape'){ e.preventDefault(); dlg.close(); }
      if(e.key === 'Tab'){
        const focusables = dlg.querySelectorAll('a,button,select,input,textarea,[tabindex]:not([tabindex="-1"])');
        const list = Array.from(focusables).filter(el=>!el.disabled && el.offsetParent !== null);
        if(list.length === 0) return;
        const first = list[0], last = list[list.length-1];
        if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
        else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
      }
    });
  } else {
    console.warn('Elemento faltando: #settingsDialog');
  }

  checkApiStatus();
}

async function iniciarPagamento(valorReais, emailOpcional) {
  const res = await fetch('/mp/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Clube de Vantagens',
      quantity: 1,
      unit_price: Number(valorReais),
      payer: emailOpcional ? { email: emailOpcional } : undefined,
      external_reference: `painel-${Date.now()}`
    })
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Falha no checkout (${res.status}) ${t}`);
  }
  const data = await res.json();
  // Redireciona o usuário para o link do MP
  window.location.href = data.init_point;
}

document.addEventListener('DOMContentLoaded', init);
