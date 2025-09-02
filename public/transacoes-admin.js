const PIN_KEY = 'cv_admin_pin';
const LIMIT = 20;
const state = { page: 0, total: 0, selected: new Set() };

function getPin(){
  return localStorage.getItem(PIN_KEY) || '';
}
function setPin(v){
  localStorage.setItem(PIN_KEY, v);
}
function toast(msg, type='info'){
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}
function readFilters(){
  return {
    cpf: document.getElementById('f-cpf').value.replace(/\D/g,''),
    desde: document.getElementById('f-desde').value,
    ate: document.getElementById('f-ate').value,
    status_pagamento: document.getElementById('f-status').value,
    metodo_pagamento: document.getElementById('f-metodo').value,
  };
}
function qs(obj){
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k,v])=>{ if(v) p.append(k,v); });
  return p.toString();
}
function fmtMoney(n){
  if(n==null) return '';
  return Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
}
function defaultDates(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,'0');
  const d = String(now.getDate()).padStart(2,'0');
  return { desde:`${y}-${m}-01`, ate:`${y}-${m}-${d}` };
}
async function fetchResumo(){
  const f = readFilters();
  delete f.cpf;
  const r = await fetch(`/admin/transacoes/resumo?${qs(f)}`,{headers:{'x-admin-pin':getPin()}});
  if(!r.ok){ toast('Erro ao carregar resumo','error'); return; }
  const j = await r.json();
  const k = document.getElementById('kpis');
  k.innerHTML = `
    <div class="kpi"><div>Transações</div><strong>${j.total||0}</strong></div>
    <div class="kpi"><div>Soma Bruta</div><strong>${fmtMoney(j.somaBruta)}</strong></div>
    <div class="kpi"><div>Soma Final</div><strong>${fmtMoney(j.somaFinal)}</strong></div>
    <div class="kpi"><div>Desconto Total</div><strong>${fmtMoney(j.descontoTotal)}</strong></div>
    <div class="kpi"><div>Desconto Médio (%)</div><strong>${Number(j.descontoMedioPercent||0).toFixed(2)}%</strong></div>
    <div class="kpi"><div>Ticket Médio</div><strong>${fmtMoney(j.ticketMedio)}</strong></div>`;
}
async function fetchTransacoes(page=0){
  state.page = page;
  const f = readFilters();
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k,v])=>{ if(v) params.append(k,v); });
  params.append('limit', LIMIT);
  params.append('offset', page*LIMIT);
  const r = await fetch(`/admin/transacoes?${params.toString()}`,{headers:{'x-admin-pin':getPin()}});
  if(!r.ok){ toast('Erro ao buscar','error'); return; }
  const j = await r.json();
  state.total = j.total || 0;
  renderRows(j.rows||[]);
}
function renderRows(rows){
  const tb = document.getElementById('rows');
  tb.innerHTML='';
  state.selected.clear();
  document.getElementById('chk-all').checked=false;
  if(rows.length===0){
    const tr=document.createElement('tr');
    tr.innerHTML = `<td colspan="12" style="text-align:center;">Sem resultados</td>`;
    tb.appendChild(tr);
  }else{
    for(const r of rows){
      const dt = r.created_at? new Date(r.created_at):null;
      const desc = r.desconto_aplicado!=null? `${r.desconto_aplicado}%`:'';
      const st = r.status_pagamento||'';
      const tr=document.createElement('tr');
      tr.innerHTML=`
        <td><input type="checkbox" data-id="${r.id}"></td>
        <td>${r.id}</td>
        <td>${dt? dt.toLocaleDateString('pt-BR'):''}</td>
        <td>${r.cpf||''}</td>
        <td class="col-cliente">${r.cliente||r.nome||''}</td>
        <td class="col-desc">${desc}</td>
        <td>${fmtMoney(r.valor_original)}</td>
        <td>${fmtMoney(r.valor_final)}</td>
        <td><span class="chip ${st}">${st}</span></td>
        <td class="col-metodo">${r.metodo_pagamento||''}</td>
        <td class="col-obs">${r.observacoes||''}</td>
        <td>
          <div class="actions">
            <button data-act="pagar" data-id="${r.id}">Pagar</button>
            <button data-act="pendente" data-id="${r.id}">Pendente</button>
            <button data-act="cancelar" data-id="${r.id}">Cancelar</button>
          </div>
        </td>`;
      tb.appendChild(tr);
    }
  }
  const totalPages = Math.max(1, Math.ceil(state.total / LIMIT));
  document.getElementById('pageinfo').textContent = `Página ${state.page+1} de ${totalPages} (${state.total} registros)`;
  updateBulkButtons();
}
function updateBulkButtons(){
  const on = state.selected.size>0;
  document.getElementById('bulk-pay').disabled=!on;
  document.getElementById('bulk-pend').disabled=!on;
  document.getElementById('bulk-cancel').disabled=!on;
}
async function patchTransacao(id, payload){
  try{
    const r = await fetch(`/admin/transacoes/${id}`,{
      method:'PATCH',
      headers:{'Content-Type':'application/json','x-admin-pin':getPin()},
      body: JSON.stringify(payload)
    });
    if(!r.ok){ throw new Error(await r.text()); }
    toast(`Transação ${id} atualizada.`, 'success');
    await fetchTransacoes(state.page);
    await fetchResumo();
  }catch(err){ toast('Erro ao atualizar: '+err.message,'error'); }
}
async function bulk(action){
  const ids = Array.from(state.selected);
  if(ids.length===0) return;
  const payloads={
    pay:{status_pagamento:'pago',metodo_pagamento:'pix',observacoes:'liquidação manual'},
    pend:{status_pagamento:'pendente',observacoes:'ajuste manual'},
    cancel:{status_pagamento:'cancelado',observacoes:'cancelamento manual'}
  };
  const payload=payloads[action];
  for(const id of ids){
    try{
      const r=await fetch(`/admin/transacoes/${id}`,{
        method:'PATCH',
        headers:{'Content-Type':'application/json','x-admin-pin':getPin()},
        body:JSON.stringify(payload)
      });
      if(!r.ok) throw new Error(await r.text());
    }catch(e){ toast(`Falha em ${id}`,'error'); }
  }
  toast('Transações atualizadas.','success');
  await fetchTransacoes(state.page);
  await fetchResumo();
}
// event listeners
document.getElementById('save-pin').addEventListener('click',()=>{
  setPin(document.getElementById('admin-pin').value.trim());
  toast('PIN salvo','success');
});

document.getElementById('btn-buscar').addEventListener('click',()=>{fetchTransacoes(0);fetchResumo();});

document.getElementById('btn-limpar').addEventListener('click',()=>{
  document.getElementById('f-cpf').value='';
  const {desde,ate}=defaultDates();
  document.getElementById('f-desde').value=desde;
  document.getElementById('f-ate').value=ate;
  document.getElementById('f-status').value='';
  document.getElementById('f-metodo').value='';
  fetchTransacoes(0);fetchResumo();
});

document.getElementById('prev').addEventListener('click',()=>{
  if(state.page>0) fetchTransacoes(state.page-1);
});

document.getElementById('next').addEventListener('click',()=>{
  const last = Math.floor((state.total-1)/LIMIT);
  if(state.page<last) fetchTransacoes(state.page+1);
});

document.getElementById('chk-all').addEventListener('change',e=>{
  const on=e.target.checked;
  document.querySelectorAll('#rows input[type="checkbox"]').forEach(c=>{
    c.checked=on;
    const id=Number(c.dataset.id);
    if(on) state.selected.add(id); else state.selected.delete(id);
  });
  updateBulkButtons();
});

document.getElementById('rows').addEventListener('change',e=>{
  if(e.target.matches('input[type="checkbox"]')){
    const id=Number(e.target.dataset.id);
    if(e.target.checked) state.selected.add(id); else state.selected.delete(id);
    updateBulkButtons();
  }
});

document.getElementById('rows').addEventListener('click',e=>{
  const act=e.target.dataset.act;
  if(!act) return;
  const id=e.target.dataset.id;
  if(act==='pagar') patchTransacao(id,{status_pagamento:'pago',metodo_pagamento:'pix',observacoes:'liquidação manual'});
  if(act==='pendente') patchTransacao(id,{status_pagamento:'pendente',observacoes:'ajuste manual'});
  if(act==='cancelar') patchTransacao(id,{status_pagamento:'cancelado',observacoes:'cancelamento manual'});
});

document.getElementById('bulk-pay').addEventListener('click',()=>bulk('pay'));
document.getElementById('bulk-pend').addEventListener('click',()=>bulk('pend'));
document.getElementById('bulk-cancel').addEventListener('click',()=>bulk('cancel'));

document.getElementById('btn-csv').addEventListener('click',()=>{
  const f = readFilters();
  const url = `/admin/transacoes/csv?${qs(f)}`;
  fetch(url,{headers:{'x-admin-pin':getPin()}})
    .then(r=>r.blob())
    .then(b=>{
      const desde=f.desde||'inicio';
      const ate=f.ate||'hoje';
      const a=document.createElement('a');
      a.href=URL.createObjectURL(b);
      a.download=`transacoes_${desde}_a_${ate}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }).catch(()=>toast('Erro ao exportar','error'));
});

function init(){
  const {desde,ate}=defaultDates();
  document.getElementById('f-desde').value=desde;
  document.getElementById('f-ate').value=ate;
  document.getElementById('admin-pin').value=getPin();
  fetchResumo();
  fetchTransacoes(0);
}
init();
