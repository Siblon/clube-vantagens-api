/* Transações Admin – sem regex, com validação de PIN e fallback de filtros no cliente */
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => Array.from(el.querySelectorAll(sel));
const fmtBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v||0));
const fmtDate = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '';
const digitsOnly = s => {
  const arr = [];
  const str = (s || '');
  for (let i=0;i<str.length;i++){ const c=str[i]; if (c >= '0' && c <= '9') arr.push(c); }
  return arr.join('');
};
const toast = (msg, timeout=2600) => { const t=$("#toast"); t.textContent=msg; t.style.display="block"; clearTimeout(toast._t); toast._t=setTimeout(()=>t.style.display="none", timeout); };

const state = {
limit: 10, offset: 0, total: 0, items: [],
filtros: { cpf:'', desde:'', ate:'', status:'', metodo:'' },
serverAcceptedStatusFilter: true,
serverAcceptedMetodoFilter: true,
};

function savePin(pin){ sessionStorage.setItem('cv_admin_pin', pin); }
function getPin(){ return sessionStorage.getItem('cv_admin_pin') || ''; }

function setLoading(b){
$("#btnBuscar").disabled = b; $("#btnCsv").disabled = b; $("#prev").disabled = b; $("#next").disabled = b;
}

function qs(params) {
const q = new URLSearchParams();
if (params.desde) q.set('desde', params.desde);
if (params.ate) q.set('ate', params.ate);
if (params.cpf) q.set('cpf', digitsOnly(params.cpf));
if (typeof params.limit==='number') q.set('limit', String(params.limit));
if (typeof params.offset==='number') q.set('offset', String(params.offset));
if (params.status) q.set('status', params.status);
if (params.metodo) q.set('metodo', params.metodo);
return q.toString();
}

async function apiFetch(path, opts={}){
const pin = getPin();
if(!pin) throw new Error('PIN não definido');
const ctrl = new AbortController();
const id = setTimeout(()=>ctrl.abort(), 10000);
try{
const res = await fetch(path, {
headers: { 'x-admin-pin': pin, 'Content-Type':'application/json', ...(opts.headers||{}) },
signal: ctrl.signal, method: opts.method||'GET', body: opts.body?JSON.stringify(opts.body):undefined
});
clearTimeout(id);
if(!res.ok){
let text = '';
try { text = await res.text(); } catch(_e) { text = res.statusText || ''; }
const snippet = (text || '').slice(0,200);
const err = new Error('HTTP ' + res.status + ' - ' + snippet);
err.status = res.status;
throw err;
}
const ct = res.headers.get('content-type') || '';
if (ct.indexOf('application/json') !== -1) return await res.json();
return await res.blob();
}catch(e){
clearTimeout(id);
throw e;
}
}

function safeHash(){
const h = (location.hash || '');
return h.startsWith('#') ? h.slice(1) : h;
}

function readFiltersFromUI(){
state.filtros = {
cpf: $("#fCpf").value.trim(),
desde: $("#fDesde").value,
ate: $("#fAte").value,
status: $("#fStatus").value,
metodo: $("#fMetodo").value
};
const share = new URLSearchParams(state.filtros);
share.set('limit', state.limit); share.set('offset', state.offset);
location.hash = share.toString();
}

function applyFiltersFromHash(){
const h = new URLSearchParams(safeHash());
$("#fCpf").value = h.get('cpf') || '';
$("#fDesde").value = h.get('desde') || $("#fDesde").value;
$("#fAte").value = h.get('ate') || $("#fAte").value;
$("#fStatus").value = h.get('status') || '';
$("#fMetodo").value = h.get('metodo') || '';
state.limit = Number(h.get('limit')||10);
state.offset = Number(h.get('offset')||0);
}

async function loadResumo(){
try{
const params = { ...state.filtros };
const q = new URLSearchParams();
if(params.desde) q.set('desde', params.desde);
if(params.ate) q.set('ate', params.ate);
if(params.status) q.set('status', params.status);
const data = await apiFetch('/admin/transacoes/resumo?' + q.toString());
const total = (data && (data.total ?? data.count ?? data.quantidade)) || 0;
const soma = (data && (data.soma_bruta ?? data.sum ?? data.valor_total)) || 0;
$('#rTotal').textContent = String(total);
$('#rSoma').textContent = fmtBRL(soma);
const porStatus = (data && (data.por_status || data.status)) || {};
const parts = [];
if (typeof porStatus.pendente !== 'undefined') parts.push('pendente: ' + porStatus.pendente);
if (typeof porStatus.pago !== 'undefined') parts.push('pago: ' + porStatus.pago);
if (typeof porStatus.cancelado !== 'undefined') parts.push('cancelado: ' + porStatus.cancelado);
$('#rPorStatus').textContent = parts.length ? parts.join(' • ') : '—';
}catch(e){
toast('Erro ao carregar resumo: ' + e.message);
}
}

function renderTable(items){
const tbody = $("#tbody");
tbody.innerHTML = '';
if(!items || items.length===0){ $("#empty").style.display='block'; return; }
$("#empty").style.display='none';
for(const t of items){
const tr = document.createElement('tr');
const id = t.id ?? t.transacao_id ?? '';
const nome = t.nome_cliente ?? t.cliente_nome ?? t.nome ?? '-';
const cpf = t.cpf ?? t.cpf_cliente ?? '';
const plano = t.plano ?? t.nome_plano ?? '-';
const valor = t.valor ?? t.valor_total ?? t.amount ?? 0;
const status = String(t.status_pagamento || t.status || '').toLowerCase();
const metodo = t.metodo || t.origem || '-';
const created = t.created_at || t.data || t.createdAt;

tr.innerHTML = ''
  + '<td>' + id + '</td>'
  + '<td class="muted">' + fmtDate(created) + '</td>'
  + '<td><div>' + (nome || '-') + '</div><div class="muted">' + (cpf ? digitsOnly(cpf) : '') + '</div></td>'
  + '<td>' + plano + '</td>'
  + '<td>' + fmtBRL(valor) + '</td>'
  + '<td><span class="status ' + status + '">' + (status || '-') + '</span></td>'
  + '<td>' + (metodo || '-') + '</td>'
  + '<td style="white-space:nowrap;display:flex;gap:6px">'
  +   '<button class="btn ok" data-act="pago" data-id="'+id+'">pagar</button>'
  +   '<button class="btn danger" data-act="cancelado" data-id="'+id+'">cancelar</button>'
  +   '<button class="btn ghost" data-act="pendente" data-id="'+id+'">pendente</button>'
  + '</td>';
tbody.appendChild(tr);


}
$("#tbody").onclick = async (ev)=>{
const btn = ev.target.closest && ev.target.closest('button[data-id]');
if(!btn) return;
const id = btn.getAttribute('data-id');
const status = btn.getAttribute('data-act');
if(!confirm('Confirmar alterar #' + id + ' para "' + status + '"?')) return;
try{
setLoading(true);
await apiFetch('/admin/transacoes/' + id, { method:'PATCH', body:{ status_pagamento: status } });
toast('Status atualizado');
await Promise.all([loadResumo(), loadLista(false)]);
}catch(e){
toast('Erro no PATCH: ' + e.message);
}finally{ setLoading(false); }
};
}

function applyClientSideFilters(items){
const tag = $("#clientFilterTag");
let used = false;
let out = items;
if(state.filtros.status && !state.serverAcceptedStatusFilter){
out = out.filter(x => String(x.status_pagamento||x.status||'').toLowerCase()===state.filtros.status);
used = true;
}
if(state.filtros.metodo && !state.serverAcceptedMetodoFilter){
out = out.filter(x => (x.metodo||x.origem||'')===state.filtros.metodo);
used = true;
}
tag.classList.toggle('hidden', !used);
return out;
}

async function loadLista(resetOffset=true){
if(resetOffset) state.offset=0;
setLoading(true);
try{
const query = qs({ ...state.filtros, limit: state.limit, offset: state.offset });
let data, acceptedStatus=true, acceptedMetodo=true;
try{
data = await apiFetch('/admin/transacoes?' + query);
}catch(e){
if(e.status>=400 && e.status<500){
const params = qs({ ...state.filtros, status:'', metodo:'', limit: state.limit, offset: state.offset });
data = await apiFetch('/admin/transacoes?' + params);
acceptedStatus = !state.filtros.status;
acceptedMetodo = !state.filtros.metodo;
}else{ throw e; }
}
state.serverAcceptedStatusFilter = acceptedStatus;
state.serverAcceptedMetodoFilter = acceptedMetodo;

let items = [];
if(Array.isArray(data)){ items = data; state.total = state.offset + data.length; }
else {
  items = data.items || data.rows || data.data || [];
  state.total = data.total ?? data.count ?? (state.offset + items.length);
}
items = applyClientSideFilters(items);
state.items = items;
renderTable(items);

const page = Math.floor(state.offset/state.limit)+1;
const hasNext = items.length===state.limit || (data.total && (state.offset+state.limit)<state.total);
$("#pageInfo").textContent = 'página ' + page;
$("#prev").disabled = state.offset<=0;
$("#next").disabled = !hasNext;
$("#serverCount").textContent = (data.total!=null ? ('| total: ' + data.total) : '');


}catch(e){
toast('Erro na listagem: ' + e.message);
}finally{
setLoading(false);
}
}

async function exportCsv(){
try{
const q = new URLSearchParams();
const f = state.filtros;
if(f.desde) q.set('desde', f.desde);
if(f.ate) q.set('ate', f.ate);
if(f.cpf) q.set('cpf', digitsOnly(f.cpf));
const blob = await apiFetch('/admin/transacoes/csv?' + q.toString());
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
 a.href = url; a.download = 'transacoes-' + Date.now() + '.csv'; a.click();
URL.revokeObjectURL(url);
}catch(e){ toast('Erro no CSV: ' + e.message); }
}

function defaultDates(){
const d = new Date();
const ate = d.toISOString().slice(0,10);
 d.setDate(d.getDate()-2);
const desde = d.toISOString().slice(0,10);
$("#fDesde").value = $("#fDesde").value || desde;
$("#fAte").value = $("#fAte").value || ate;
}

async function validatePinUI(){
const pin = getPin();
if(!pin){ $("#pinStatus").textContent = ''; return; }
$("#pinStatus").textContent = 'validando…';
$("#pinStatus").className = 'pin-status';
try{
await apiFetch('/admin/transacoes/resumo'); // sem filtros
$("#pinStatus").textContent = 'PIN OK';
$("#pinStatus").className = 'pin-status pin-ok';
toast('PIN validado com sucesso');
}catch(e){
$("#pinStatus").textContent = 'PIN inválido';
$("#pinStatus").className = 'pin-status pin-bad';
toast('PIN inválido: ' + e.message);
}
}

function bindUI(){
$("#btnSavePin").onclick = async ()=>{ savePin($("#pin").value); await validatePinUI(); };
$("#btnBuscar").onclick = ()=>{ readFiltersFromUI(); loadResumo(); loadLista(true); };
$("#btnLimpar").onclick = ()=>{
$("#fCpf").value=''; $("#fStatus").value=''; $("#fMetodo").value='';
defaultDates(); readFiltersFromUI(); loadResumo(); loadLista(true);
};
$("#btnCsv").onclick = exportCsv;
$("#prev").onclick = ()=>{ state.offset = Math.max(0, state.offset - state.limit); readFiltersFromUI(); loadLista(false); };
$("#next").onclick = ()=>{ state.offset += state.limit; readFiltersFromUI(); loadLista(false); };
$("#pageSize").onchange = (e)=>{ state.limit = Number(e.target.value); state.offset=0; readFiltersFromUI(); loadLista(true); };
$("#fCpf").addEventListener('input', (e)=>{ e.target.value = digitsOnly(e.target.value).slice(0,11); });
window.addEventListener('hashchange', ()=>{ applyFiltersFromHash(); readFiltersFromUI(); loadResumo(); loadLista(true); });
}

(function init(){
defaultDates();
applyFiltersFromHash();
$("#pin").value = getPin();
$("#pageSize").value = String(state.limit);
bindUI();
readFiltersFromUI();
validatePinUI(); // feedback imediato se já havia PIN salvo
loadResumo();
loadLista(true);
})();

