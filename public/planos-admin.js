function toast(msg, type = 'info') {
  const box = document.getElementById('toasts');
  if (!box) return alert(msg);
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

async function apiAdmin(path, opts = {}) {
  let pin = localStorage.getItem('admin_pin');
  if (!pin) {
    pin = prompt('PIN admin:');
    if (pin) localStorage.setItem('admin_pin', pin);
  }
  const headers = new Headers(opts.headers || {});
  if (pin) headers.set('x-admin-pin', pin);
  let body = opts.body;
  if (body && typeof body !== 'string') {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }
  try {
    const r = await fetch(path, { ...opts, headers, body });
    if (!r.ok) {
      const err = await r.text();
      toast(err || 'Erro', 'error');
      throw new Error(err);
    }
    if (r.status === 204) return null;
    const ct = r.headers.get('content-type') || '';
    return ct.includes('application/json') ? await r.json() : null;
  } catch (e) {
    toast('Falha de rede', 'error');
    throw e;
  }
}

const state = { limit: 20, offset: 0, q: '' };
let editingId = null;

async function carregarLista() {
  const params = new URLSearchParams({ limit: state.limit, offset: state.offset });
  if (state.q) params.set('q', state.q);
  try {
    const j = await apiAdmin('/admin/planos?' + params.toString());
    const tbody = document.getElementById('grid');
    tbody.innerHTML = '';
    (j.rows || []).forEach(p => {
      const tr = document.createElement('tr');
      tr.dataset.id = p.id;
      tr.dataset.nome = p.nome;
      tr.dataset.desconto = p.desconto_percent;
      tr.dataset.prioridade = p.prioridade;
      tr.dataset.ativo = p.ativo;
      tr.innerHTML = `
        <td>${p.nome}</td>
        <td>${p.desconto_percent}</td>
        <td>${p.prioridade}</td>
        <td><input type="checkbox" class="toggle-ativo" ${p.ativo ? 'checked' : ''}></td>
        <td>${new Date(p.updated_at).toLocaleString('pt-BR')}</td>
        <td>
          <button type="button" class="btn btn--ghost btn-edit">Editar</button>
          <button type="button" class="btn btn--ghost btn-rename">Renomear</button>
        </td>`;
      tbody.appendChild(tr);
    });
    const total = j.total || 0;
    const start = total ? state.offset + 1 : 0;
    const end = Math.min(state.offset + state.limit, total);
    document.getElementById('pag-info').textContent = `${start}-${end} de ${total}`;
    document.getElementById('btn-prev').disabled = state.offset <= 0;
    document.getElementById('btn-next').disabled = state.offset + state.limit >= total;
  } catch (_) {
    // erro já tratado em apiAdmin
  }
}

function onEdit(tr) {
  editingId = tr.dataset.id;
  document.getElementById('form-title').textContent = 'Editar Plano';
  document.getElementById('btn-salvar').textContent = 'Salvar';
  document.getElementById('nome').value = tr.dataset.nome;
  document.getElementById('desconto_percent').value = tr.dataset.desconto;
  document.getElementById('prioridade').value = tr.dataset.prioridade;
  document.getElementById('ativo').checked = tr.dataset.ativo === 'true';
}

async function onSubmitForm(e) {
  e.preventDefault();
  const body = {
    nome: document.getElementById('nome').value.trim(),
    desconto_percent: Number(document.getElementById('desconto_percent').value),
    prioridade: Number(document.getElementById('prioridade').value) || 0,
    ativo: document.getElementById('ativo').checked
  };
  try {
    if (editingId) {
      await apiAdmin('/admin/planos/' + editingId, { method: 'PATCH', body });
      toast('Plano atualizado', 'ok');
    } else {
      await apiAdmin('/admin/planos', { method: 'POST', body });
      toast('Plano criado', 'ok');
    }
    e.target.reset();
    editingId = null;
    document.getElementById('form-title').textContent = 'Novo Plano';
    document.getElementById('btn-salvar').textContent = 'Criar';
    carregarLista();
  } catch (_) {}
}

function limparForm() {
  document.getElementById('form-plano').reset();
  editingId = null;
  document.getElementById('form-title').textContent = 'Novo Plano';
  document.getElementById('btn-salvar').textContent = 'Criar';
}

async function toggleAtivo(id, ativo, el) {
  try {
    await apiAdmin('/admin/planos/' + id, { method: 'PATCH', body: { ativo } });
    toast('Atualizado', 'ok');
  } catch (_) {
    el.checked = !ativo;
  }
}

function openRename(tr) {
  const dlg = document.getElementById('dlg-rename');
  document.getElementById('rename-from').value = tr.dataset.nome;
  document.getElementById('rename-to').value = tr.dataset.nome;
  dlg.showModal();
}

async function onRename(e) {
  e.preventDefault();
  const from = document.getElementById('rename-from').value;
  const to = document.getElementById('rename-to').value.trim();
  const update_clientes = document.getElementById('rename-propagar').checked;
  try {
    await apiAdmin('/admin/planos/rename', {
      method: 'POST',
      body: { from, to, update_clientes }
    });
    toast('Plano renomeado', 'ok');
    document.getElementById('dlg-rename').close();
    carregarLista();
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', () => {
  carregarLista();
  document.getElementById('btn-buscar').addEventListener('click', () => {
    state.q = document.getElementById('q').value.trim();
    state.offset = 0;
    carregarLista();
  });
  document.getElementById('btn-prev').addEventListener('click', () => {
    state.offset = Math.max(0, state.offset - state.limit);
    carregarLista();
  });
  document.getElementById('btn-next').addEventListener('click', () => {
    state.offset += state.limit;
    carregarLista();
  });
  document.getElementById('form-plano').addEventListener('submit', onSubmitForm);
  document.getElementById('btn-limpar').addEventListener('click', limparForm);
  document.getElementById('grid').addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.classList.contains('btn-edit')) {
      onEdit(tr);
    } else if (e.target.classList.contains('btn-rename')) {
      openRename(tr);
    }
  });
  document.getElementById('grid').addEventListener('change', (e) => {
    if (e.target.classList.contains('toggle-ativo')) {
      const tr = e.target.closest('tr');
      toggleAtivo(tr.dataset.id, e.target.checked, e.target);
    }
  });
  document.getElementById('form-rename').addEventListener('submit', onRename);
  document.getElementById('rename-cancel').addEventListener('click', () => {
    document.getElementById('dlg-rename').close();
  });
});

