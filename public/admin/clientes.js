import { sanitizeCpf, formatCpf } from './cpf-utils.js';

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
      renderClientes();
    }catch(err){
      showMessage(err.message || 'Erro ao buscar', 'error');
    }finally{
      updatePager();
      loadingDiv.hidden = true;
    }
  }

  function renderClientes(){
    if(state.currentRows.length === 0){
      rowsTbody.innerHTML = '<tr><td colspan="8">Nenhum cliente encontrado</td></tr>';
      return;
    }
    rowsTbody.innerHTML = '';
    state.currentRows.forEach((c) => {
      const tr = document.createElement('tr');
      const cpfSan = sanitizeCpf(c.cpf);
      tr.innerHTML = `<td>${formatCpf(c.cpf)}</td><td>${c.nome||''}</td><td>${c.plano||'—'}</td><td>${c.status||''}</td><td>${c.metodo_pagamento||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td></td>`;
      const actionsTd = tr.lastElementChild;
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => editCliente(cpfSan));
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'btn-remove';
      removeBtn.dataset.cpf = cpfSan;
      removeBtn.textContent = 'Remover';
      actionsTd.append(editBtn, document.createTextNode(' '), removeBtn);
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

  function editCliente(cpf){
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
    editDialog.showModal();
  }

  cancelEditBtn.addEventListener('click', () => editDialog.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = editForm.dataset.cpf;
    const payload = {};
    const fd = new FormData(editForm);
    for (const [k, v] of fd.entries()) {
      if (k === 'cpf') continue;
      if (v !== '') {
        payload[k] = v;
      } else if (['plano','metodo_pagamento','email','telefone','vencimento'].includes(k)) {
        payload[k] = null;
      }
    }
    try{
      const resp = await fetch(`/admin/clientes/${cpf}`, {
        method:'PUT',
        headers: withPinHeaders({ 'Content-Type':'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){ showMessage('Erro: ' + (data.error || 'falha'), 'error'); return; }
      showMessage('Cliente atualizado!', 'success');
      editDialog.close();
      const idx = state.currentRows.findIndex(r => sanitizeCpf(r.cpf) === cpf);
      if(idx >= 0){
        state.currentRows[idx] = data.cliente || { ...state.currentRows[idx], ...payload };
        renderClientes();
      }
    }catch(err){ showMessage('Erro: ' + (err.message || 'falha'), 'error'); }
  });

  function init(){
    syncUIFromState();
    fetchList();
  }

  init();
