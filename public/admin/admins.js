const API = window.API_BASE || '';
const pinHeader = () => ({ 'x-admin-pin': localStorage.getItem('ADMIN_PIN') || '' });

async function fetchJson(url, opts = {}) {
  const resp = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...pinHeader()
    }
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data.error || 'request_failed');
  return data;
}

let currentAdminId = null;

async function loadMe() {
  try {
    const j = await fetchJson(`${API}/admin/whoami`);
    currentAdminId = j?.admin?.id || null;
  } catch (_) {
    currentAdminId = null;
  }
}

function formatDate(s) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleString('pt-BR');
  } catch (_) {
    return s;
  }
}

async function list() {
  try {
    const j = await fetchJson(`${API}/admin/admins`);
    renderTable(Array.isArray(j.admins) ? j.admins : []);
  } catch (err) {
    showMessage('Falha ao carregar admins', 'error');
  }
}

async function create(nome, pin) {
  await fetchJson(`${API}/admin/admins`, {
    method: 'POST',
    body: JSON.stringify({ nome, pin })
  });
}

async function updatePin(id, pin) {
  await fetchJson(`${API}/admin/admins/${id}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ pin })
  });
}

async function remove(id) {
  await fetchJson(`${API}/admin/admins/${id}`, { method: 'DELETE' });
}

function renderTable(admins) {
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  const single = admins.length <= 1;
  for (const a of admins) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${a.nome}</td><td>${formatDate(a.created_at)}</td>`;
    const td = document.createElement('td');

    const btnPin = document.createElement('button');
    btnPin.textContent = 'Trocar PIN';
    btnPin.addEventListener('click', () => openPinModal(a.id));
    td.appendChild(btnPin);

    if (single) {
      const btnRem = document.createElement('button');
      btnRem.textContent = 'Remover';
      btnRem.disabled = true;
      td.appendChild(btnRem);
    } else if (a.id !== currentAdminId) {
      const btnRem = document.createElement('button');
      btnRem.textContent = 'Remover';
      btnRem.addEventListener('click', () => confirmRemove(a.id, btnRem));
      td.appendChild(btnRem);
    }

    tr.appendChild(td);
    tbody.appendChild(tr);
  }
}

function openNewModal() {
  const dlg = document.getElementById('modal-new');
  dlg.showModal();
}

function closeNewModal() {
  document.getElementById('modal-new').close();
}

function openPinModal(id) {
  const dlg = document.getElementById('modal-pin');
  dlg.dataset.id = id;
  dlg.showModal();
}

function closePinModal() {
  document.getElementById('modal-pin').close();
}

async function confirmRemove(id, btn) {
  if (!confirm('Remover admin?')) return;
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Removendo...';
  try {
    await remove(id);
    showMessage('Admin removido.');
    await list();
  } catch (err) {
    showMessage('Erro ao remover admin', 'error');
  }
  btn.disabled = false;
  btn.textContent = old;
}

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('btn-new').addEventListener('click', openNewModal);
  document.getElementById('btn-close-new').addEventListener('click', closeNewModal);
  document.getElementById('btn-close-pin').addEventListener('click', closePinModal);

  const formNew = document.getElementById('form-new');
  formNew.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-create');
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Carregando...';
    const nome = formNew.nome.value.trim();
    const pin = formNew.pin.value;
    try {
      await create(nome, pin);
      showMessage('Admin criado!');
      formNew.reset();
      closeNewModal();
      await list();
    } catch (err) {
      showMessage('Erro ao criar admin', 'error');
    }
    btn.disabled = false;
    btn.textContent = old;
  });

  const formPin = document.getElementById('form-pin');
  formPin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const dlg = document.getElementById('modal-pin');
    const id = dlg.dataset.id;
    const btn = document.getElementById('btn-update');
    btn.disabled = true;
    const old = btn.textContent;
    btn.textContent = 'Carregando...';
    const pin = formPin.pin.value;
    try {
      await updatePin(id, pin);
      showMessage('PIN atualizado!');
      formPin.reset();
      closePinModal();
      await list();
    } catch (err) {
      showMessage('Erro ao atualizar PIN', 'error');
    }
    btn.disabled = false;
    btn.textContent = old;
  });

  await loadMe();
  await list();
});

export { list, create, updatePin, remove };

