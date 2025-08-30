import { sanitizeCpf, formatCpf, isValidCpf } from './cpf-utils.js';

const state = { q:'', status:'', plano:'', limit:20, offset:0, total:0, currentRows:[] };

const qInput = document.getElementById('q');
const statusSel = document.getElementById('status');
const planoSel = document.getElementById('plano');
const filterBtn = document.getElementById('filtrar');
const clearBtn = document.getElementById('limpar');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const infoSpan = document.getElementById('info');
const rowsTbody = document.getElementById('rows');
const loadingDiv = document.getElementById('loading');
const generateBtn = document.getElementById('gerar-ids');
const pinInput = document.getElementById('pin');
const savePinBtn = document.getElementById('save-pin');

const editDialog = document.getElementById('editDialog');
const editForm = document.getElementById('editForm');
const cancelEditBtn = document.getElementById('cancelEdit');
const table = document.querySelector('table');

  function applyFiltersFromUI(){
    state.q = qInput.value.trim();
    state.status = statusSel.value;
    state.plano = planoSel.value;
  }

  function syncUIFromState(){
    qInput.value = state.q;
    statusSel.value = state.status;
    planoSel.value = state.plano;
  }

  async function fetchList(){
    const params = new URLSearchParams();
    if(state.q) params.append('q', state.q);
    if(state.status) params.append('status', state.status);
    if(state.plano) params.append('plano', state.plano);
    params.append('limit', state.limit);
    params.append('offset', state.offset);
    loadingDiv.hidden = false;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    try{
      const resp = await fetch('/admin/clientes?'+params.toString(), { headers: withPinHeaders() });
      const data = await resp.json().catch(()=>({ rows:[], total:0 }));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){ showMessage(data.error || 'Erro ao buscar', 'error'); return; }
      state.currentRows = data.rows || [];
      state.total = data.total || 0;
      renderRows();
    }catch(err){
      showMessage(err.message || 'Erro ao buscar', 'error');
    }finally{
      updatePager();
      loadingDiv.hidden = true;
    }
  }

  function renderRows(){
    if(state.currentRows.length === 0){
      rowsTbody.innerHTML = '<tr><td colspan="8">Nenhum cliente encontrado</td></tr>';
      return;
    }
    rowsTbody.innerHTML = '';
    state.currentRows.forEach((c, idx) => {
      const tr = document.createElement('tr');
      const cpfSan = sanitizeCpf(c.cpf);
      tr.innerHTML = `<td>${formatCpf(c.cpf)}</td><td>${c.nome||''}</td><td>${c.plano||'—'}</td><td>${c.status||''}</td><td>${c.metodo_pagamento||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td><button class="edit" data-index="${idx}">Editar</button> <button type="button" class="btn-remove" data-cpf="${cpfSan}">Remover</button></td>`;
      rowsTbody.appendChild(tr);
    });
  }

  function updatePager(){
    const start = state.total === 0 ? 0 : state.offset + 1;
    const end = state.offset + state.currentRows.length;
    infoSpan.textContent = `Mostrando ${start}-${end} de ${state.total}`;
    prevBtn.disabled = state.offset === 0;
    nextBtn.disabled = state.offset + state.currentRows.length >= state.total;
  }

  filterBtn.addEventListener('click', () => {
    applyFiltersFromUI();
    state.offset = 0;
    fetchList();
  });

  clearBtn.addEventListener('click', () => {
    state.q = '';
    state.status = '';
    state.plano = '';
    syncUIFromState();
    state.offset = 0;
    fetchList();
  });

  prevBtn.addEventListener('click', () => {
    if(state.offset === 0) return;
    state.offset = Math.max(0, state.offset - state.limit);
    fetchList();
  });

  nextBtn.addEventListener('click', () => {
    if(state.offset + state.currentRows.length >= state.total) return;
    state.offset += state.limit;
    fetchList();
  });

  generateBtn.addEventListener('click', async () => {
    generateBtn.disabled = true;
    try{
      const resp = await fetch('/admin/clientes/generate-ids', { method:'POST', headers: withPinHeaders() });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){
        if(data.error === 'missing_column'){
          showMessage("Coluna 'id_interno' não existe. Crie no Supabase.", 'error');
        }else{
          showMessage(data.error || 'Erro ao gerar IDs', 'error');
        }
        return;
      }
      showMessage(`${data.updated || 0} IDs gerados`, 'success');
      fetchList();
    }catch(err){
      showMessage(err.message || 'Erro ao gerar IDs', 'error');
    }finally{
      generateBtn.disabled = false;
    }
  });

  pinInput.value = getPin();
  savePinBtn.addEventListener('click', () => {
    setPin(pinInput.value.trim());
    showMessage('PIN salvo', 'success');
  });

  table.addEventListener('click', async (ev) => {
    const btn = ev.target.closest('.btn-remove');
    if (!btn) return;

    const cpf = btn.dataset.cpf;
    if (!cpf) return;

    if (!confirm('Remover este cliente?')) return;

    btn.disabled = true;
    try {
      const res = await fetch(`/admin/clientes/${cpf}`, {
        method: 'DELETE',
        headers: withPinHeaders({'Content-Type':'application/json'})
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
      showMessage('Cliente removido.', 'success');
      await fetchList();
    } catch (e) {
      showMessage(`Falha ao remover: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  rowsTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.edit');
    if (!btn) return;
    const idx = btn.dataset.index;
    const c = state.currentRows[idx];
    if (!c) return;
    editForm.cpf.value = c.cpf;
    editForm.nome.value = c.nome || '';
    editForm.plano.value = c.plano || '';
    editForm.status.value = c.status || 'ativo';
    editForm.metodo_pagamento.value = c.metodo_pagamento || '';
    editForm.email.value = c.email || '';
    editForm.telefone.value = c.telefone || '';
    editDialog.showModal();
  });

  cancelEditBtn.addEventListener('click', () => editDialog.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    const fd = new FormData(editForm);
    for (const [k, v] of fd.entries()) {
      if (v !== '') {
        payload[k] = v;
      } else if (k === 'plano' || k === 'metodo_pagamento') {
        payload[k] = null;
      }
    }
    try{
      const resp = await fetch('/admin/clientes', {
        method:'POST',
        headers: withPinHeaders({ 'Content-Type':'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){ showMessage(data.error || 'Erro ao salvar', 'error'); return; }
      showMessage('Cliente atualizado', 'success');
      editDialog.close();
      fetchList();
    }catch(err){ showMessage(err.message || 'Erro ao salvar', 'error'); }
  });

  function init(){
    syncUIFromState();
    fetchList();
  }

  init();
