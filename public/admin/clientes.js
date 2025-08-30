(function(){
  const limit = 20;
  let offset = 0;
  const form = document.getElementById('filtros');
  const tbody = document.querySelector('#lista tbody');
  const pinInput = document.getElementById('pin');
  const savePinBtn = document.getElementById('save-pin');

  const stored = localStorage.getItem('ADMIN_PIN');
  if (stored) pinInput.value = stored;

  savePinBtn.addEventListener('click', () => {
    const val = pinInput.value.trim();
    localStorage.setItem('ADMIN_PIN', val);
    alert('PIN salvo!');
  });

  async function fetchClientes(params={}){
    const pin = getPin();
    const query = new URLSearchParams({ limit, offset, ...params });
    try{
      const resp = await fetch(`/admin/clientes?${query.toString()}`, {
        headers: { 'x-admin-pin': pin }
      });
      if(resp.status === 401){
        alert('PIN inválido');
        return;
      }
      const data = await resp.json().catch(()=>[]);
      if(!resp.ok){
        alert(data.error || 'Erro ao buscar');
        return;
      }
      tbody.innerHTML='';
      data.forEach(c=>{
        const tr=document.createElement('tr');
        tr.innerHTML=`<td>${c.nome||''}</td><td>${c.email||''}</td><td>${c.telefone||''}</td><td>${c.status||''}</td><td>${c.plano||''}</td><td><button class="editar" data-cpf="${c.cpf}">Editar</button> <button class="remover" data-cpf="${c.cpf}">Remover</button></td>`;
        tbody.appendChild(tr);
      });
    }catch(err){
      alert(err.message||'Erro ao buscar');
    }
  }

  form.addEventListener('submit',e=>{
    e.preventDefault();
    offset=0;
    const params=Object.fromEntries(new FormData(form).entries());
    fetchClientes(params);
  });

  document.getElementById('limpar').addEventListener('click',()=>{
    form.reset();
    offset=0;
    fetchClientes();
  });

  document.getElementById('prev').addEventListener('click',()=>{
    if(offset>=limit){
      offset-=limit;
      const params=Object.fromEntries(new FormData(form).entries());
      fetchClientes(params);
    }
  });
  document.getElementById('next').addEventListener('click',()=>{
    offset+=limit;
    const params=Object.fromEntries(new FormData(form).entries());
    fetchClientes(params);
  });

  tbody.addEventListener('click',async e=>{
    const btn=e.target;
    if(btn.classList.contains('remover')){
      const cpf=btn.dataset.cpf;
      if(!confirm('Remover este cliente?')) return;
      try{
        const resp=await fetch(`/admin/clientes/${cpf}`,{method:'DELETE',headers:{'x-admin-pin':getPin()}});
        if(resp.status===401){alert('PIN inválido');return;}
        const data=await resp.json().catch(()=>({}));
        if(!resp.ok){alert(data.error||'Erro ao remover');return;}
        fetchClientes(Object.fromEntries(new FormData(form).entries()));
      }catch(err){alert(err.message||'Erro ao remover');}
    }
    if(btn.classList.contains('editar')){
      const cpf=btn.dataset.cpf;
      const status=prompt('Status (ativo/inativo):');
      const plano=prompt('Plano (mensal/semestral/anual):');
      const body={};
      if(status) body.status=status;
      if(plano) body.plano=plano;
      try{
        const resp=await fetch(`/admin/clientes/${cpf}`,{method:'PUT',headers:{'Content-Type':'application/json','x-admin-pin':getPin()},body:JSON.stringify(body)});
        if(resp.status===401){alert('PIN inválido');return;}
        const data=await resp.json().catch(()=>({}));
        if(!resp.ok){alert(data.error||'Erro ao editar');return;}
        fetchClientes(Object.fromEntries(new FormData(form).entries()));
      }catch(err){alert(err.message||'Erro ao editar');}
    }
  });

  fetchClientes();
})();
