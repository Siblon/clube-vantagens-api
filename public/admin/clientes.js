import { sanitizeCpf, formatCpf } from './cpf-utils.js';

const PAGE_SIZE_KEY = 'ADMIN_PAGE_SIZE';
const savedSize = parseInt(localStorage.getItem(PAGE_SIZE_KEY), 10);
const initialSize = [25, 50, 100, 200].includes(savedSize) ? savedSize : 25;
const state = { q:'', status:'', plano:'', limit:initialSize, offset:0, total:0, currentRows:[] };

const qInput = document.getElementById('q');
const statusSel = document.getElementById('status');
const planoSel = document.getElementById('plano');
const filterBtn = document.getElementById('filtrar');
const clearBtn = document.getElementById('limpar');
const pageSizeSel = document.getElementById('page-size');
const exportBtn = document.getElementById('btn-export');
const exportAllChk = document.getElementById('export-all');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const infoSpan = document.getElementById('info');
const rowsTbody = document.getElementById('rows');
const loadingDiv = document.getElementById('loading');
const pinInput = document.getElementById('pin');
const savePinBtn = document.getElementById('save-pin');

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const cancelEditBtn = document.getElementById('cancel-edit');
const saveEditBtn = document.getElementById('save-edit');
const table = document.querySelector('table');

  function setLoading(flag){
    loadingDiv.hidden = !flag;
  }

  function applyFiltersFromUI(){
    state.q = qInput.value.trim();
    state.status = statusSel.value;
    state.plano = planoSel.value;
  }

  function syncUIFromState(){
    qInput.value = state.q;
    statusSel.value = state.status;
    planoSel.value = state.plano;
    if(pageSizeSel) pageSizeSel.value = String(state.limit);
  }

  async function fetchList(){
    const params = new URLSearchParams();
    if(state.q) params.append('q', state.q);
    if(state.status) params.append('status', state.status);
    if(state.plano) params.append('plano', state.plano);
    params.append('limit', state.limit);
    params.append('offset', state.offset);
    setLoading(true);
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    try{
      const resp = await fetch('/admin/clientes?'+params.toString(), { headers: withPinHeaders() });
      const data = await resp.json().catch(()=>({ rows:[], total:0 }));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){ showMessage(data.error || 'Erro ao buscar', 'error'); return; }
      state.currentRows = data.rows || [];
      state.total = data.total || 0;
      renderClientes();
    }catch(err){
      showMessage(err.message || 'Erro ao buscar', 'error');
    }finally{
      updatePager();
      setLoading(false);
    }
  }

  function renderClientes(){
    if(state.currentRows.length === 0){
      rowsTbody.innerHTML = '<tr><td colspan="8">Nenhum cliente encontrado. <button type="button" id="btn-clear-inline">Limpar filtros</button></td></tr>';
      document.getElementById('btn-clear-inline')?.addEventListener('click', ()=> clearBtn.click());
      return;
    }
    rowsTbody.innerHTML = '';
    state.currentRows.forEach((c) => {
      const cpfSan = sanitizeCpf(c.cpf);
      const tr = document.createElement('tr');
      tr.dataset.cpf = cpfSan;
      tr.innerHTML = `<td>${formatCpf(c.cpf)}</td><td>${c.nome||''}</td><td>${c.plano||'—'}</td><td>${c.status||''}</td><td>${c.metodo_pagamento||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td><button type="button" class="btn-edit" data-cpf="${cpfSan}">Editar</button> <button type="button" class="btn-remove" data-cpf="${cpfSan}">Remover</button></td>`;
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

  let qTimer;
  qInput.addEventListener('input', () => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {
      applyFiltersFromUI();
      state.offset = 0;
      fetchList();
    }, 300);
  });
  qInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      e.preventDefault();
      clearTimeout(qTimer);
      applyFiltersFromUI();
      state.offset = 0;
      fetchList();
    }
  });

  pageSizeSel?.addEventListener('change', () => {
    const val = parseInt(pageSizeSel.value, 10);
    state.limit = val;
    localStorage.setItem(PAGE_SIZE_KEY, String(val));
    state.offset = 0;
    fetchList();
  });

  exportBtn?.addEventListener('click', async () => {
    const params = new URLSearchParams();
    if(state.q) params.append('q', state.q);
    if(state.status) params.append('status', state.status);
    if(state.plano) params.append('plano', state.plano);
    if(exportAllChk?.checked){
      params.append('export_all', '1');
    }else{
      params.append('limit', state.limit);
      params.append('offset', state.offset);
    }
    exportBtn.disabled = true;
    setLoading(true);
    try{
      const resp = await fetch('/admin/clientes/export?'+params.toString(), { headers: withPinHeaders() });
      if(!resp.ok) throw new Error('http '+resp.status);
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'clientes.csv';
      a.click();
    }catch(err){
      showMessage('Falha ao exportar. Tente novamente.', 'error');
    }finally{
      exportBtn.disabled = false;
      setLoading(false);
    }
  });

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
 
  document.getElementById('btn-generate-ids')?.addEventListener('click', async () => {
    const el = document.getElementById('message') || { textContent: '' };
    try {
      const res = await fetch('/admin/clientes/generate-ids', {
        method: 'POST',
        headers: withPinHeaders({ 'Content-Type': 'application/json' })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        el.textContent = `Falha ao gerar IDs: ${json.error || res.status}`;
        el.style.color = 'red';
        return;
      }
      el.textContent = `IDs gerados com sucesso. Escaneados: ${json.scanned}, atualizados: ${json.updated}.`;
      el.style.color = 'green';
    } catch (e) {
      el.textContent = `Erro ao gerar IDs: ${e.message}`;
      el.style.color = 'red';
    }
  });

  pinInput.value = getPin();
  savePinBtn.addEventListener('click', () => {
    setPin(pinInput.value.trim());
    showMessage('PIN salvo', 'success');
  });

  table.addEventListener('click', async (ev) => {
    const editBtn = ev.target.closest('.btn-edit');
    if (editBtn) {
      const cpf = editBtn.dataset.cpf;
      if (cpf) openEditModal(cpf);
      return;
    }

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

  function openEditModal(cpf){
    const c = state.currentRows.find(r => sanitizeCpf(r.cpf) === cpf);
    if(!c) return;
    editForm.dataset.cpf = cpf;
    editForm.cpf.value = formatCpf(c.cpf);
    editForm.nome.value = c.nome || '';
    editForm.plano.value = c.plano || '';
    editForm.status.value = c.status || 'ativo';
    editForm.metodo_pagamento.value = c.metodo_pagamento || '';
    editForm.email.value = c.email || '';
    editForm.telefone.value = c.telefone || '';
    editForm.vencimento.value = c.vencimento || '';
    editModal.showModal();
  }

  cancelEditBtn.addEventListener('click', () => editModal.close());

  async function saveEdit(e){
    e.preventDefault();
    const cpf = editForm.dataset.cpf;
    const payload = {};
    const fd = new FormData(editForm);
    for (const [k, v] of fd.entries()) {
      if (k === 'cpf') continue;
      if (v) {
        payload[k] = v;
      }
    }
    if(payload.vencimento === '') delete payload.vencimento;

    saveEditBtn.disabled = true;
    const oldTxt = saveEditBtn.textContent;
    saveEditBtn.textContent = 'Salvando...';
    try{
      const resp = await fetch(`/admin/clientes/${cpf}`, {
        method:'PUT',
        headers: withPinHeaders({ 'Content-Type':'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){ showMessage('PIN inválido. Salve o PIN no topo e tente de novo.', 'error'); return; }
      if(!resp.ok || !data.ok){ showMessage(`Erro: ${data.error || 'falha'}`, 'error'); return; }
      const idx = state.currentRows.findIndex(r => sanitizeCpf(r.cpf) === cpf);
      if(idx >= 0){
        state.currentRows[idx] = data.cliente;
      }
      updateRowInTable(cpf, data.cliente);
      editModal.close();
      showMessage('Cliente atualizado!', 'success');
    }catch(err){ showMessage('Erro: ' + (err.message || 'falha'), 'error'); }
    finally{
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = oldTxt;
    }
  }

  editForm.addEventListener('submit', saveEdit);

  function updateRowInTable(cpf, patch){
    const tr = rowsTbody.querySelector(`tr[data-cpf="${cpf}"]`);
    if(!tr) return;
    const cells = tr.children;
    if(patch.nome !== undefined) cells[1].textContent = patch.nome || '';
    if(patch.plano !== undefined) cells[2].textContent = patch.plano || '—';
    if(patch.status !== undefined) cells[3].textContent = patch.status || '';
    if(patch.metodo_pagamento !== undefined) cells[4].textContent = patch.metodo_pagamento || '';
    if(patch.email !== undefined) cells[5].textContent = patch.email || '';
    if(patch.telefone !== undefined) cells[6].textContent = patch.telefone || '';
  }

  function init(){
    syncUIFromState();
    fetchList();
  }

  init();
