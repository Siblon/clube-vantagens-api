const PAGE_SIZE_KEY = 'ADMIN_PAGE_SIZE';
const savedSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY), 10);
const initialSize = [25,50,100,200].includes(savedSize) ? savedSize : 25;
const state = { route:'', action:'', date_from:'', date_to:'', limit:initialSize, offset:0, total:0, rows:[] };

const routeInput = document.getElementById('route');
const actionSel = document.getElementById('action');
const dateFromInput = document.getElementById('date-from');
const dateToInput = document.getElementById('date-to');
const pageSizeSel = document.getElementById('page-size');
const filterBtn = document.getElementById('filtrar');
const clearBtn = document.getElementById('limpar');
const exportBtn = document.getElementById('export');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const infoSpan = document.getElementById('info');
const rowsTbody = document.getElementById('rows');
const loadingDiv = document.getElementById('loading');
const detailModal = document.getElementById('detail-modal');
const detailPre = document.getElementById('detail-pre');
const detailMore = document.getElementById('detail-more');
const closeDetail = document.getElementById('close-detail');
const pinInput = document.getElementById('pin');
const savePinBtn = document.getElementById('save-pin');

if(pinInput){ pinInput.value = getPin(); }
savePinBtn?.addEventListener('click', ()=> setPin(pinInput.value.trim()));

function setLoading(flag){ loadingDiv.hidden = !flag; }
function applyFiltersFromUI(){
  state.route = routeInput.value.trim();
  state.action = actionSel.value;
  state.date_from = dateFromInput.value;
  state.date_to = dateToInput.value;
}
function syncUIFromState(){
  routeInput.value = state.route;
  actionSel.value = state.action;
  dateFromInput.value = state.date_from;
  dateToInput.value = state.date_to;
  if(pageSizeSel) pageSizeSel.value = String(state.limit);
}
async function fetchList(){
  const params = new URLSearchParams();
  if(state.route) params.append('route', state.route);
  if(state.action) params.append('action', state.action);
  if(state.date_from) params.append('date_from', state.date_from);
  if(state.date_to) params.append('date_to', state.date_to);
  params.append('limit', state.limit);
  params.append('offset', state.offset);
  setLoading(true);
  prevBtn.disabled = true; nextBtn.disabled = true;
  try{
    const resp = await fetch('/admin/audit?'+params.toString(), { headers: withPinHeaders() });
    const data = await resp.json().catch(()=>({rows:[], total:0}));
    if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
    if(!resp.ok){ showMessage(data.error || 'Erro ao buscar', 'error'); return; }
    state.rows = data.rows || [];
    state.total = data.total || 0;
    renderRows();
  }catch(err){
    showMessage(err.message || 'Erro ao buscar', 'error');
  }finally{
    updatePager();
    setLoading(false);
  }
}
function renderRows(){
  if(state.rows.length === 0){
    rowsTbody.innerHTML = '<tr><td colspan="6">Nenhum log encontrado.</td></tr>';
    return;
  }
  rowsTbody.innerHTML = '';
  state.rows.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(r.created_at).toLocaleString()}</td><td>${r.route}</td><td>${r.action}</td><td>${r.client_cpf||''}</td><td>${(r.admin_pin_hash||'').slice(0,8)}</td><td><button type="button" class="btn-detail" data-idx="${i}">Ver Detalhes</button></td>`;
    rowsTbody.appendChild(tr);
  });
  rowsTbody.querySelectorAll('.btn-detail').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = parseInt(btn.dataset.idx,10);
      openDetail(state.rows[idx]);
    });
  });
}
function updatePager(){
  const start = state.total===0?0:state.offset+1;
  const end = state.offset + state.rows.length;
  infoSpan.textContent = `Mostrando ${start}-${end} de ${state.total}`;
  prevBtn.disabled = state.offset === 0;
  nextBtn.disabled = state.offset + state.rows.length >= state.total;
}
function openDetail(row){
  const text = JSON.stringify(row.payload, null, 2) || '';
  const MAX = 1000;
  if(text.length > MAX){
    detailPre.textContent = text.slice(0,MAX) + '...';
    detailMore.hidden = false;
    detailMore.onclick = ()=>{ detailPre.textContent = text; detailMore.hidden = true; };
  }else{
    detailPre.textContent = text;
    detailMore.hidden = true;
  }
  detailModal.showModal();
}
closeDetail.addEventListener('click', ()=> detailModal.close());
let routeTimer;
routeInput.addEventListener('input', ()=>{
  clearTimeout(routeTimer);
  routeTimer = setTimeout(()=>{
    applyFiltersFromUI();
    state.offset = 0;
    fetchList();
  },300);
});
routeInput.addEventListener('keydown', e=>{
  if(e.key === 'Enter'){
    e.preventDefault();
    clearTimeout(routeTimer);
    applyFiltersFromUI();
    state.offset = 0;
    fetchList();
  }
});
pageSizeSel?.addEventListener('change', ()=>{
  const val = parseInt(pageSizeSel.value,10);
  state.limit = val;
  localStorage.setItem(PAGE_SIZE_KEY, String(val));
  state.offset = 0;
  fetchList();
});
filterBtn.addEventListener('click', ()=>{
  applyFiltersFromUI();
  state.offset = 0;
  fetchList();
});
clearBtn.addEventListener('click', ()=>{
  state.route='';
  state.action='';
  state.date_from='';
  state.date_to='';
  syncUIFromState();
  state.offset = 0;
  fetchList();
});
prevBtn.addEventListener('click', ()=>{
  if(state.offset === 0) return;
  state.offset = Math.max(0, state.offset - state.limit);
  fetchList();
});
nextBtn.addEventListener('click', ()=>{
  if(state.offset + state.rows.length >= state.total) return;
  state.offset += state.limit;
  fetchList();
});
exportBtn.addEventListener('click', async ()=>{
  const params = new URLSearchParams();
  if(state.route) params.append('route', state.route);
  if(state.action) params.append('action', state.action);
  if(state.date_from) params.append('date_from', state.date_from);
  if(state.date_to) params.append('date_to', state.date_to);
  params.append('limit', state.limit);
  params.append('offset', state.offset);
  exportBtn.disabled = true;
  setLoading(true);
  try{
    const resp = await fetch('/admin/audit/export?'+params.toString(), { headers: withPinHeaders() });
    if(!resp.ok) throw new Error('http '+resp.status);
    const blob = await resp.blob();
    const a = document.createElement('a');
    const now = new Date().toISOString().slice(0,10);
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${now}.csv`;
    a.click();
  }catch(err){
    showMessage('Falha ao exportar. Tente novamente.', 'error');
  }finally{
    exportBtn.disabled = false;
    setLoading(false);
  }
});

syncUIFromState();
fetchList();
