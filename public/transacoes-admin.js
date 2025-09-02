const API = ''; // vazio = mesmo host (usamos caminhos relativos)
const PIN_KEY = 'admin_pin';

function getPin() {
  let p = sessionStorage.getItem(PIN_KEY) || localStorage.getItem(PIN_KEY);
  if (!p) {
    p = prompt('PIN do admin:');
    if (!p) throw new Error('PIN necessário');
    sessionStorage.setItem(PIN_KEY, p);
  }
  return p;
}

async function apiAdmin(path, opts = {}) {
  const pin = getPin();
  const res = await fetch((API || '') + path, {
    ...opts,
    headers: {
      'x-admin-pin': pin,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    alert(`Erro ${res.status}: ${txt}`);
    throw new Error(txt);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

let state = { page: 0, limit: 20, total: 0, lastQuery: {} };

function readFilters() {
  const cpf = document.getElementById('f-cpf').value.replace(/\D/g,'');
  const desde = document.getElementById('f-desde').value;
  const ate   = document.getElementById('f-ate').value;
  const metodo = document.getElementById('f-metodo').value;
  const status = document.getElementById('f-status').value;
  return { cpf, desde, ate, metodo_pagamento: metodo, status_pagamento: status };
}

async function load(page = 0) {
  state.page = Math.max(0, page);
  const q = readFilters();
  state.lastQuery = q;
  const params = new URLSearchParams({
    ...Object.fromEntries(Object.entries(q).filter(([_,v]) => v)),
    limit: String(state.limit),
    offset: String(state.page * state.limit),
    order: 'created_at.desc'
  });
  const j = await apiAdmin(`/admin/transacoes?` + params.toString());
  state.total = j.total || 0;
  renderRows(j.rows || []);
}

function renderRows(rows) {
  const tb = document.getElementById('rows');
  tb.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    const fmtMoney = (n)=> (n==null?'':Number(n).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}));
    const dt = r.created_at ? new Date(r.created_at) : null;

    tr.innerHTML = `
      <td>${r.id}</td>
      <td>${dt ? dt.toLocaleString('pt-BR') : ''}</td>
      <td>${r.cpf || ''}</td>
      <td>${r.metodo_pagamento || ''}</td>
      <td>${r.status_pagamento || ''}</td>
      <td>${fmtMoney(r.valor_original)}</td>
      <td>${r.desconto_aplicado || ''}</td>
      <td>${fmtMoney(r.valor_final)}</td>
    `;
    tb.appendChild(tr);
  }
  const start = state.page * state.limit + 1;
  const end = Math.min((state.page+1)*state.limit, state.total);
  document.getElementById('pageinfo').textContent =
    `Página ${state.page+1} — registros ${start}-${end} de ${state.total}`;
}

document.getElementById('btn-buscar').addEventListener('click', () => load(0));
document.getElementById('prev').addEventListener('click', () => {
  if (state.page > 0) load(state.page - 1);
});
document.getElementById('next').addEventListener('click', () => {
  const lastPage = Math.floor((state.total-1) / state.limit);
  if (state.page < lastPage) load(state.page + 1);
});

document.getElementById('btn-csv').addEventListener('click', () => {
  const q = readFilters();
  const params = new URLSearchParams(Object.fromEntries(Object.entries(q).filter(([_,v])=>v)));
  const pin = getPin();
  // Abre em nova aba com o header via query fallback (?pin=...), e também tentamos header via fetch+blob se preferir
  const url = `/admin/transacoes/csv?${params.toString()}`;
  // Usamos fetch para mandar o header x-admin-pin
  fetch(url, { headers: { 'x-admin-pin': pin } })
    .then(r => r.blob())
    .then(b => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'transacoes.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(e => alert('Falha ao baixar CSV: ' + e.message));
});

// carregamento inicial
load(0).catch(e => console.error(e));
