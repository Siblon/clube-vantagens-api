(function(){
  const limit = 20;
  let offset = 0;
  let total = 0;

  const form = document.getElementById('filtros');
  const tbody = document.querySelector('#lista tbody');
  const pinInput = document.getElementById('pin');
  const savePinBtn = document.getElementById('save-pin');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const infoSpan = document.getElementById('info');
  const clearBtn = document.getElementById('limpar');
  const searchBtn = form.querySelector('button[type="submit"]');

  pinInput.value = getPin();
  savePinBtn.addEventListener('click', () => {
    setPin(pinInput.value.trim());
    alert('PIN salvo!');
  });

  function setLoading(state){
    [prevBtn, nextBtn, clearBtn, searchBtn].forEach(b => b.disabled = state);
    if(state){
      tbody.innerHTML = '<tr><td colspan="7">Carregando...</td></tr>';
    }
  }

  function updateInfo(){
    const start = total === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, total);
    infoSpan.textContent = `Exibindo ${start}-${end} de ${total}`;
    prevBtn.disabled = offset <= 0;
    nextBtn.disabled = offset + limit >= total;
  }

  async function fetchClientes(params={}){
    setLoading(true);
    const query = new URLSearchParams({ limit, offset, ...params });
    try{
      const resp = await fetch(`/admin/clientes?${query.toString()}`, { headers: withPinHeaders() });
      const data = await resp.json().catch(()=>({rows:[], total:0}));
      if(resp.status === 401){
        alert('PIN inválido. Ajuste o PIN no topo e tente novamente.');
        return;
      }
      if(!resp.ok){
        alert(data.error || 'Erro ao buscar');
        return;
      }
      const rows = data.rows || [];
      total = data.total || 0;
      if(rows.length === 0){
        tbody.innerHTML = '<tr><td colspan="7">Nenhum cliente encontrado</td></tr>';
      }else{
        tbody.innerHTML = '';
        rows.forEach(c => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${c.cpf||''}</td><td>${c.nome||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td>${c.status||''}</td><td>${c.plano||''}</td><td><button class="editar" data-cpf="${c.cpf}">Editar</button> <button class="remover" data-cpf="${c.cpf}">Remover</button></td>`;
          tbody.appendChild(tr);
        });
      }
      updateInfo();
    }catch(err){
      alert(err.message || 'Erro ao buscar');
    }finally{
      setLoading(false);
    }
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    offset = 0;
    const params = Object.fromEntries(new FormData(form).entries());
    fetchClientes(params);
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    offset = 0;
    fetchClientes();
  });

  prevBtn.addEventListener('click', () => {
    if(offset >= limit){
      offset -= limit;
      const params = Object.fromEntries(new FormData(form).entries());
      fetchClientes(params);
    }
  });
  nextBtn.addEventListener('click', () => {
    if(offset + limit < total){
      offset += limit;
      const params = Object.fromEntries(new FormData(form).entries());
      fetchClientes(params);
    }
  });

  tbody.addEventListener('click', async e => {
    const btn = e.target;
    const cpf = btn.dataset.cpf;
    if(btn.classList.contains('remover')){
      if(!confirm('Remover este cliente?')) return;
      try{
        const resp = await fetch(`/admin/clientes/${cpf}`, { method: 'DELETE', headers: withPinHeaders() });
        const data = await resp.json().catch(()=>({}));
        if(resp.status === 401){alert('PIN inválido. Ajuste o PIN no topo e tente novamente.');return;}
        if(!resp.ok){alert(data.error || 'Erro ao remover');return;}
        fetchClientes(Object.fromEntries(new FormData(form).entries()));
      }catch(err){alert(err.message || 'Erro ao remover');}
    }
    if(btn.classList.contains('editar')){
      const status = prompt('Status (ativo/inativo):');
      const plano = prompt('Plano (Mensal/Semestral/Anual):');
      const body = {};
      if(status) body.status = status;
      if(plano) body.plano = plano;
      try{
        const resp = await fetch(`/admin/clientes/${cpf}`, {
          method: 'PUT',
          headers: withPinHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(body)
        });
        const data = await resp.json().catch(()=>({}));
        if(resp.status === 401){alert('PIN inválido. Ajuste o PIN no topo e tente novamente.');return;}
        if(!resp.ok){alert(data.error || 'Erro ao editar');return;}
        fetchClientes(Object.fromEntries(new FormData(form).entries()));
      }catch(err){alert(err.message || 'Erro ao editar');}
    }
  });

  fetchClientes();
})();
