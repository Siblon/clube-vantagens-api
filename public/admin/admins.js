function formatDate(s){
  if(!s) return '';
  try{ return new Date(s).toLocaleString('pt-BR'); }
  catch{ return s; }
}

async function loadAdmins(){
  try{
    const resp = await fetch('/admin/admins', withPinHeaders());
    if(!resp.ok) throw new Error();
    const data = await resp.json().catch(()=>null);
    renderRows(Array.isArray(data?.admins)?data.admins:[]);
  }catch{
    showMessage('Falha ao carregar admins','error');
  }
}

function renderRows(admins){
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  const multiple = admins.length > 1;
  for(const a of admins){
    const tr = document.createElement('tr');
    const created = formatDate(a.created_at);
    let actions = '';
    if(multiple){
      actions = `<button data-id="${a.id}" class="btn-remove">Remover</button>`;
    }
    tr.innerHTML = `<td>${a.nome}</td><td>${created}</td><td>${actions}</td>`;
    tbody.appendChild(tr);
  }
  if(multiple){
    tbody.querySelectorAll('.btn-remove').forEach(btn => {
      btn.addEventListener('click', async () => {
        if(!confirm('Remover admin?')) return;
        const id = btn.dataset.id;
        try{
          const resp = await fetch(`/admin/admins/${id}`, withPinHeaders({ method:'DELETE' }));
          if(!resp.ok) throw new Error();
          showMessage('Admin removido');
          loadAdmins();
        }catch{
          showMessage('Falha ao remover admin','error');
        }
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('admin-form');
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const pin = form.pin.value;
    try{
      const resp = await fetch('/admin/admins', withPinHeaders({
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nome, pin })
      }));
      if(!resp.ok) throw new Error();
      form.reset();
      showMessage('Admin criado');
      loadAdmins();
    }catch{
      showMessage('Falha ao criar admin','error');
    }
  });
  loadAdmins();
});

