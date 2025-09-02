(() => {
  const API = window.__API_BASE__ || 'https://clube-vantagens-api-production.up.railway.app';

  function getPin() {
    let pin = localStorage.getItem('admin_pin');
    if (!pin) {
      pin = prompt('Digite o PIN de administrador:');
      if (pin) localStorage.setItem('admin_pin', pin);
    }
    return pin;
  }

  async function apiAdmin(path, opts = {}) {
    const pin = getPin();
    const headers = Object.assign({
      'x-admin-pin': pin,
      ...(opts.body ? { 'Content-Type': 'application/json' } : {})
    }, opts.headers || {});
    const res = await fetch(API + path, Object.assign({}, opts, { headers }));
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) {
      alert('Erro: ' + (json?.error || text || res.status));
      throw new Error(text);
    }
    return json;
  }

  // Estado
  const state = { q: '', limit: 20, offset: 0, total: 0, rows: [] };

  // Elementos
  const tbody = document.getElementById('tbody');
  const qEl = document.getElementById('q');
  const btnBuscar = document.getElementById('btn-buscar');
  const pageInfo = document.getElementById('pageInfo');
  const prev = document.getElementById('prev');
  const next = document.getElementById('next');

  const form = document.getElementById('form');
  const idEl = document.getElementById('id');
  const nomeEl = document.getElementById('nome');
  const pctEl = document.getElementById('desconto_percent');
  const prioEl = document.getElementById('prioridade');
  const ativoEl = document.getElementById('ativo');
  const btnLimpar = document.getElementById('btn-limpar');
  const formTitle = document.getElementById('form-title');

  const dlg = document.getElementById('dlg-renomear');
  const btnNovo = document.getElementById('btn-novo');
  const btnRenomear = document.getElementById('btn-renomear');
  const rnFrom = document.getElementById('rn-from');
  const rnTo = document.getElementById('rn-to');
  const rnPropaga = document.getElementById('rn-propaga');
  const rnCancel = document.getElementById('rn-cancel');
  const rnOk = document.getElementById('rn-ok');

  const migraModal = document.getElementById('modal-migrar');
  const migraFrom = document.getElementById('migra-from');
  const migraTo = document.getElementById('migra-to');
  const migraAtivos = document.getElementById('migra-ativos');
  const migraResult = document.getElementById('migra-result');
  const btnMigraPreview = document.getElementById('btn-migra-preview');
  const btnMigraExec = document.getElementById('btn-migra-exec');
  const btnMigraClose = document.getElementById('btn-migra-close');

  function fmtDate(s) {
    if (!s) return '-';
    try { return new Date(s).toLocaleString(); } catch { return s; }
  }

  function render() {
    tbody.innerHTML = '';
    for (const r of state.rows) {
      const tr = document.createElement('tr');

      const tdNome = document.createElement('td'); tdNome.textContent = r.nome;
      const tdPct = document.createElement('td'); tdPct.textContent = (r.desconto_percent ?? 0) + '%';
      const tdPrio = document.createElement('td'); tdPrio.textContent = r.prioridade ?? 0;

      const tdAtivo = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = 'pill' + (r.ativo ? ' on' : '');
      pill.textContent = r.ativo ? 'Ativo' : 'Inativo';
      tdAtivo.appendChild(pill);

      const tdUpd = document.createElement('td'); tdUpd.textContent = fmtDate(r.updated_at);

      const tdAcoes = document.createElement('td'); tdAcoes.className = 'row-actions';
      const btnEdit = document.createElement('button'); btnEdit.textContent = 'Editar';
      btnEdit.addEventListener('click', () => onEdit(r));
      tdAcoes.appendChild(btnEdit);
      const btnDel = document.createElement('button');
      btnDel.textContent = 'Apagar';
      btnDel.addEventListener('click', () => onDelete(r));
      tdAcoes.appendChild(btnDel);

      const btnMig = document.createElement('button');
      btnMig.textContent = 'Migrar';
      btnMig.addEventListener('click', () => openMigrar(r.nome));
      tdAcoes.appendChild(btnMig);

      tr.append(tdNome, tdPct, tdPrio, tdAtivo, tdUpd, tdAcoes);
      tbody.appendChild(tr);
    }
    const page = Math.floor(state.offset / state.limit) + 1;
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    pageInfo.textContent = `Página ${page} de ${totalPages} • ${state.total} registro(s)`;
    prev.disabled = state.offset <= 0;
    next.disabled = state.offset + state.limit >= state.total;
  }

  async function load() {
    const q = encodeURIComponent(state.q || '');
    const url = `/admin/planos?limit=${state.limit}&offset=${state.offset}&q=${q}`;
    const json = await apiAdmin(url);
    state.rows = json.rows || [];
    state.total = json.total || 0;
    render();
  }

  function clearForm() {
    idEl.value = '';
    nomeEl.value = '';
    nomeEl.disabled = false;
    pctEl.value = '';
    prioEl.value = '0';
    ativoEl.checked = true;
    formTitle.textContent = 'Criar/Editar plano';
  }

  function onEdit(r) {
    idEl.value = r.id;
    nomeEl.value = r.nome;
    nomeEl.disabled = true; // renomear é pela ação dedicada
    pctEl.value = r.desconto_percent ?? 0;
    prioEl.value = r.prioridade ?? 0;
    ativoEl.checked = !!r.ativo;
    formTitle.textContent = `Editando: ${r.nome}`;
  }

  async function onDelete(r) {
    const yes = confirm(`Apagar o plano "${r.nome}"? Esta ação é definitiva e só é permitida se não houver clientes usando este plano.`);
    if (!yes) return;
    try {
      await apiAdmin(`/admin/planos/${r.id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      // apiAdmin já mostra o alerta do erro; reforçamos a dica aqui
      alert('Não foi possível apagar. Dica: use "Renomear" com update_clientes=ON para migrar clientes para outro plano, ou edite e desmarque "Ativo".');
    }
  }

  function showModal(id){ document.getElementById(id).style.display='block'; }
  function hideModal(id){ document.getElementById(id).style.display='none'; }

  async function carregarPlanosDestino(exceptName){
    const j = await apiAdmin('/admin/planos?limit=100');
    migraTo.innerHTML = '';
    (j.rows || [])
      .filter(p => p.nome !== exceptName && p.ativo)
      .sort((a,b)=> (a.prioridade||0)-(b.prioridade||0))
      .forEach(p=>{
        const opt = document.createElement('option');
        opt.value = p.nome;
        opt.textContent = `${p.nome} (${p.desconto_percent || 0}%)`;
        migraTo.appendChild(opt);
      });
  }

  function openMigrar(fromName){
    migraResult.textContent = '';
    migraFrom.textContent = `Plano origem: ${fromName}`;
    carregarPlanosDestino(fromName);
    showModal('modal-migrar');
    btnMigraPreview.onclick = () => migrar(fromName, true);
    btnMigraExec.onclick = () => {
      if (confirm('Confirmar migração? Esta ação altera o plano dos clientes selecionados.')) {
        migrar(fromName, false);
      }
    };
  }

  async function migrar(fromName, dryRun){
    const to = migraTo.value;
    const body = { from: fromName, to, dry_run: !!dryRun };
    if (migraAtivos.checked) body.only_status = 'ativo';
    const j = await apiAdmin('/admin/planos/migrar', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (j.preview){
      migraResult.textContent = `Preview: ${j.count} cliente(s) seriam migrados de ${j.from} → ${j.to}` +
        (j.only_status ? ` (apenas status=${j.only_status})` : '');
    } else {
      migraResult.textContent = `Migração concluída: ${j.migrated} cliente(s) migrados de ${j.from} → ${j.to}` +
        (j.only_status ? ` (apenas status=${j.only_status})` : '');
      load();
    }
  }

  btnMigraClose.addEventListener('click', ()=> hideModal('modal-migrar'));

  // Eventos de lista
  btnBuscar.addEventListener('click', () => { state.q = qEl.value.trim(); state.offset = 0; load(); });
  qEl.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ btnBuscar.click(); }});
  prev.addEventListener('click', ()=>{ state.offset = Math.max(0, state.offset - state.limit); load(); });
  next.addEventListener('click', ()=>{ state.offset += state.limit; load(); });

  // Form submit (create/update)
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = idEl.value || '';
    const nome = nomeEl.value.trim();
    const desconto_percent = parseFloat(pctEl.value);
    const prioridade = parseInt(prioEl.value || '0', 10);
    const ativo = !!ativoEl.checked;

    if (!nome || isNaN(desconto_percent)) {
      alert('Preencha nome e percentual válido.'); return;
    }

    if (!id) {
      // CREATE
      await apiAdmin('/admin/planos', {
        method: 'POST',
        body: JSON.stringify({ nome, desconto_percent, prioridade, ativo })
      });
      clearForm();
    } else {
      // UPDATE (sem renomear)
      await apiAdmin(`/admin/planos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ desconto_percent, prioridade, ativo })
      });
    }
    await load();
  });

  btnLimpar.addEventListener('click', clearForm);
  btnNovo.addEventListener('click', clearForm);

  // Renomear
  btnRenomear.addEventListener('click', ()=>{ rnFrom.value=''; rnTo.value=''; rnPropaga.checked=false; dlg.showModal(); });
  rnCancel.addEventListener('click', ()=> dlg.close());
  rnOk.addEventListener('click', async ()=>{
    const from = rnFrom.value.trim();
    const to = rnTo.value.trim();
    const update_clientes = !!rnPropaga.checked;
    if(!from || !to){ alert('Preencha os dois nomes.'); return; }
    await apiAdmin('/admin/planos/rename', {
      method: 'POST',
      body: JSON.stringify({ from, to, update_clientes })
    });
    dlg.close();
    clearForm();
    await load();
  });

  // Inicial
  load();
})();

