(function(){
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
  const generateBtn = document.getElementById('gerar-ids');
  const pinInput = document.getElementById('pin');
  const savePinBtn = document.getElementById('save-pin');

  const editDialog = document.getElementById('editDialog');
  const editForm = document.getElementById('editForm');
  const cancelEditBtn = document.getElementById('cancelEdit');

  function formatCpf(cpf){
    const digits = (cpf || '').toString().padStart(11, '0');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
  }

  async function fetchList(){
    const params = new URLSearchParams();
    if(state.q) params.append('q', state.q);
    if(state.status) params.append('status', state.status);
    if(state.plano) params.append('plano', state.plano);
    params.append('limit', state.limit);
    params.append('offset', state.offset);
    try{
      const resp = await fetch('/admin/clientes?'+params.toString(), { headers: withPinHeaders() });
      const data = await resp.json().catch(()=>({ rows:[], total:0 }));
      if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
      if(!resp.ok){ showMessage(data.error || 'Erro ao buscar', 'error'); return; }
      state.currentRows = data.rows || [];
      state.total = data.total || 0;
      renderRows();
      updatePager();
    }catch(err){
      showMessage(err.message || 'Erro ao buscar', 'error');
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
      tr.innerHTML = `<td>${formatCpf(c.cpf)}</td><td>${c.nome||''}</td><td>${c.plano||'—'}</td><td>${c.status||''}</td><td>${c.metodo_pagamento||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td><button class="edit" data-index="${idx}">Editar</button> <button class="remove" data-cpf="${c.cpf}">Remover</button></td>`;
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
      showMessage(`IDs atualizados: ${data.updated || 0}`, 'success');
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

  rowsTbody.addEventListener('click', async (e) => {
    const btn = e.target;
    if(btn.classList.contains('remove')){
      const cpf = btn.dataset.cpf;
      if(!confirm('Remover?')) return;
      try{
        const resp = await fetch(`/admin/clientes/${cpf}`, { method:'DELETE', headers: withPinHeaders() });
        const data = await resp.json().catch(()=>({}));
        if(resp.status === 401){ showMessage('PIN inválido', 'error'); return; }
        if(!resp.ok){ showMessage(data.error || 'Erro ao remover', 'error'); return; }
        showMessage('Cliente removido', 'success');
        fetchList();
      }catch(err){ showMessage(err.message || 'Erro ao remover', 'error'); }
    }
    if(btn.classList.contains('edit')){
      const idx = btn.dataset.index;
      const c = state.currentRows[idx];
      if(!c) return;
      editForm.cpf.value = c.cpf;
      editForm.nome.value = c.nome || '';
      editForm.plano.value = c.plano || '';
      editForm.status.value = c.status || 'ativo';
      editForm.metodo_pagamento.value = c.metodo_pagamento || 'pix';
      editForm.email.value = c.email || '';
      editForm.telefone.value = c.telefone || '';
      editDialog.showModal();
    }
  });

  cancelEditBtn.addEventListener('click', () => editDialog.close());

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {};
    const fd = new FormData(editForm);
    for(const [k,v] of fd.entries()){
      if(v !== '') payload[k] = v;
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
})();
