function getPin(){ return (document.getElementById('pin').value || sessionStorage.getItem('admin_pin') || '').trim(); }
function setPin(v){ document.getElementById('pin').value=v||''; if(v) sessionStorage.setItem('admin_pin', v); }
function setMsg(text, type='info'){ const el=document.getElementById('msg'); if(!text){ el.hidden=true; el.className='msg'; el.textContent=''; return;} el.hidden=false; el.textContent=text; el.className='msg'+(type==='error'?' msg--error':type==='ok'?' msg--ok':''); }
function setPinStatus(state){ const s=document.getElementById('pin-status'); s.className='badge'; if(state==='ok'){ s.textContent='PIN OK'; s.classList.add('badge--ok'); } else if(state==='error'){ s.textContent='PIN inválido'; s.classList.add('badge--error'); } else { s.textContent='aguardando'; } }
function setLoading(flag){ const tbody=document.getElementById('grid'); const btn=document.getElementById('btn-buscar'); if(flag){ btn.disabled=true; btn.dataset.label=btn.textContent; btn.innerHTML='<span class="spinner"></span> Buscando...'; tbody.innerHTML = Array.from({length:5}).map(()=>'<tr class="skeleton-row"><td colspan="8"></td></tr>').join(''); } else { btn.disabled=false; if(btn.dataset.label) btn.textContent=btn.dataset.label; } }

async function validarPin(){ const pin=getPin(); if(!pin){ setMsg('Informe o PIN administrador.', 'error'); setPinStatus('error'); return false; }
  try{
    const r = await fetch('/admin/leads?limit=1', { headers:{ 'x-admin-pin': pin }});
    if(r.status===401){ setMsg('PIN inválido. Confira o código e tente novamente.', 'error'); setPinStatus('error'); return false; }
    if(!r.ok){ const t=await r.text(); setMsg('Erro ao validar PIN: '+t, 'error'); setPinStatus('error'); return false; }
    setPin(pin); setPinStatus('ok'); setMsg('PIN confirmado.', 'ok'); return true;
  }catch(e){ setMsg('Falha de rede ao validar PIN.', 'error'); setPinStatus('error'); return false; }
}

async function buscar(){
  setMsg('');
  const pin = getPin();
  if(!(await validarPin())) return;
  const status = document.getElementById('status').value || '';
  const plano  = document.getElementById('plano').value || '';
  const q      = document.getElementById('q').value || '';
  const btnCsv = document.getElementById('btn-csv');
  btnCsv.disabled = true;
  setLoading(true);
  try{
    const url = `/admin/leads?status=${encodeURIComponent(status)}&plano=${encodeURIComponent(plano)}&q=${encodeURIComponent(q)}&limit=100`;
    const r = await fetch(url, { headers:{ 'x-admin-pin': pin }});
    if(r.status===401){ setMsg('PIN inválido.', 'error'); setPinStatus('error'); setLoading(false); return; }
    if(!r.ok){ let err='Erro ao buscar'; try{ const j=await r.json(); if(j.error) err=j.error; }catch(_){ } setMsg(err, 'error'); setLoading(false); return; }
    const data = await r.json();
    renderGrid(data || []);
    btnCsv.disabled = (data||[]).length===0;
    if((data||[]).length===0) setMsg('Nenhum lead encontrado para os filtros.', 'info');
  }catch(e){ setMsg('Falha de rede ao buscar.', 'error'); }
  finally{ setLoading(false); }
}

function renderGrid(rows){
  const tb = document.getElementById('grid');
  tb.innerHTML = (rows||[]).map(r => `
    <tr>
      <td>${escapeHtml(r.nome||'')}</td>
      <td>${escapeHtml(r.cpf||'')}</td>
      <td>${escapeHtml(r.email||'')}</td>
      <td>${escapeHtml(r.telefone||'')}</td>
      <td>${escapeHtml(r.plano||'')}</td>
      <td>${escapeHtml(r.origem||'')}</td>
      <td>${escapeHtml(r.status||'')}</td>
      <td>
        <button class="btn btn--sm" data-act="approve" data-id="${r.id}">Aprovar</button>
        <button class="btn btn--sm btn--outline" data-act="discard" data-id="${r.id}">Descartar</button>
      </td>
    </tr>`).join('');
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#039;' }[m])); }

document.getElementById('grid').addEventListener('click', async (e)=>{
  const btn=e.target.closest('button[data-act]'); if(!btn) return;
  const id=btn.dataset.id; const act=btn.dataset.act; const pin=getPin();
  const url = act==='approve' ? '/admin/leads/approve' : '/admin/leads/discard';
  const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json','x-admin-pin':pin}, body: JSON.stringify({ id }) });
  if(!r.ok){ const t=await r.text(); setMsg('Erro: '+t, 'error'); return; }
  buscar();
});

document.getElementById('btn-csv').addEventListener('click', async ()=>{
  const pin=getPin(); if(!(await validarPin())) return;
  const status = document.getElementById('status').value || '';
  const plano  = document.getElementById('plano').value || '';
  const q      = document.getElementById('q').value || '';
  const url = `/admin/leads.csv?status=${encodeURIComponent(status)}&plano=${encodeURIComponent(plano)}&q=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers:{ 'x-admin-pin': pin }});
  if(!r.ok){ const t=await r.text(); setMsg('Erro no CSV: '+t, 'error'); return; }
  const blob = await r.blob(); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='leads.csv'; a.click();
});

const form = document.getElementById('filters') || document.body;
form.addEventListener('keydown', (e)=>{
  if(e.key==='Enter'){ e.preventDefault(); buscar(); }
  if(e.key==='Escape'){ const q=document.getElementById('q'); if(q){ q.value=''; } }
});
document.getElementById('validar-pin').addEventListener('click', validarPin);
document.getElementById('toggle-pin').addEventListener('click', ()=>{
  const i=document.getElementById('pin'); i.type = i.type==='password' ? 'text' : 'password';
});

(()=>{
  const saved = sessionStorage.getItem('admin_pin'); if(saved){ setPin(saved); validarPin(); }
  document.getElementById('btn-buscar').addEventListener('click', buscar);
})();

