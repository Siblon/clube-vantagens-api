function getPin() {
  const el = document.getElementById('pin');
  let pin = el.value.trim() || sessionStorage.getItem('admin-pin') || '';
  if (pin) {
    sessionStorage.setItem('admin-pin', pin);
    if (!el.value) el.value = pin;
  }
  return pin;
}

function buildQuery() {
  const params = new URLSearchParams();
  const status = document.getElementById('status').value;
  const plano = document.getElementById('plano').value;
  const q = document.getElementById('q').value.trim();
  if (status) params.set('status', status);
  if (plano) params.set('plano', plano);
  if (q) params.set('q', q);
  return params.toString();
}

async function fetchLeads() {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const q = buildQuery();
  const res = await fetch(`/admin/leads?${q}`, {
    headers: { 'x-admin-pin': pin },
  });
  if (!res.ok) return alert('Erro ao buscar');
  const data = await res.json();
  renderTable(data.rows || []);
}

function renderTable(rows) {
  const tbody = document.querySelector('#tbl-leads tbody');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.nome}</td><td>${r.cpf}</td><td>${r.email || ''}</td><td>${r.telefone || ''}</td><td>${r.plano}</td><td>${r.origem || ''}</td><td>${r.status}</td><td>${r.status === 'novo' ? '<button class="btn-approve" data-id="' + r.id + '">Aprovar</button> <button class="btn-discard" data-id="' + r.id + '">Descartar</button>' : ''}</td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-approve').forEach((btn) => {
    btn.addEventListener('click', () => approve(btn.dataset.id));
  });
  tbody.querySelectorAll('.btn-discard').forEach((btn) => {
    btn.addEventListener('click', () => discard(btn.dataset.id));
  });
}

async function approve(id) {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const res = await fetch('/admin/leads/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) return alert('Erro ao aprovar');
  alert('Lead aprovado');
  fetchLeads();
}

async function discard(id) {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const notes = prompt('Motivo do descarte?') || '';
  const res = await fetch('/admin/leads/discard', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
    body: JSON.stringify({ id, notes }),
  });
  if (!res.ok) return alert('Erro ao descartar');
  alert('Lead descartado');
  fetchLeads();
}

async function exportCsv() {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const q = buildQuery();
  const res = await fetch(`/admin/leads.csv?${q}`, {
    headers: { 'x-admin-pin': pin },
  });
  if (!res.ok) return alert('Erro ao exportar');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

let searchTimer = null;
function handleSearch() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(fetchLeads, 400);
}

function init() {
  const saved = sessionStorage.getItem('admin-pin');
  if (saved) document.getElementById('pin').value = saved;
  document.getElementById('btn-buscar').addEventListener('click', fetchLeads);
  document.getElementById('btn-csv').addEventListener('click', exportCsv);
  document.getElementById('q').addEventListener('input', handleSearch);
}

document.addEventListener('DOMContentLoaded', init);
