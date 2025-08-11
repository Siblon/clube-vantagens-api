let chartDia = null;
let chartPlano = null;

function applyTheme(theme) {
  const t = theme || localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}
function toggleTheme() {
  const current = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

function showToast({ type = 'info', text = '' }) {
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

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
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return params.toString();
}

function formatBRL(n) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n) || 0);
}

async function fetchMetrics() {
  const pin = getPin();
  if (!pin) return showToast({ type: 'error', text: 'Informe o PIN' });
  const q = buildQuery();
  try {
    const res = await fetch(`/admin/metrics?${q}`, { headers: { 'x-admin-pin': pin } });
    if (!res.ok) throw new Error('Erro ao buscar métricas');
    const data = await res.json();
    renderMetrics(data);
  } catch (err) {
    showToast({ type: 'error', text: err.message });
  }
}

function renderMetrics(data) {
  document.getElementById('kpi-clientes-ativos').textContent = data.clientes.ativos;
  document.getElementById('kpi-clientes-total').textContent = data.clientes.total;
  document.getElementById('kpi-qtd').textContent = data.totais.qtdTransacoes;
  document.getElementById('kpi-bruto').textContent = formatBRL(data.totais.bruto);
  document.getElementById('kpi-desc').textContent = formatBRL(data.totais.descontos);
  document.getElementById('kpi-liq').textContent = formatBRL(data.totais.liquido);

  renderCharts(data);
  renderTop(data.topClientes);
}

function renderCharts(data) {
  const ctx1 = document.getElementById('chart-dia');
  if (chartDia) chartDia.destroy();
  chartDia = new Chart(ctx1, {
    type: 'line',
    data: {
      labels: data.porDia.map((d) => d.date),
      datasets: [
        {
          label: 'Líquido',
          data: data.porDia.map((d) => d.liquido),
          borderColor: '#2d6cdf',
          backgroundColor: 'transparent',
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  const ctx2 = document.getElementById('chart-plano');
  if (chartPlano) chartPlano.destroy();
  chartPlano = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: data.porPlano.map((p) => p.plano),
      datasets: [
        {
          label: 'Líquido',
          data: data.porPlano.map((p) => p.liquido),
          backgroundColor: '#2d6cdf',
        },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

function renderTop(rows) {
  const tbody = document.querySelector('#tbl-top tbody');
  tbody.innerHTML = '';
  rows.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.cpf}</td><td>${r.nome}</td><td>${r.qtd}</td><td>${formatBRL(r.bruto)}</td><td>${formatBRL(r.descontos)}</td><td>${formatBRL(r.liquido)}</td>`;
    tbody.appendChild(tr);
  });
}

function exportCSV() {
  const pin = getPin();
  if (!pin) return showToast({ type: 'error', text: 'Informe o PIN' });
  const q = buildQuery();
  fetch(`/admin/metrics/transacoes.csv?${q}`, { headers: { 'x-admin-pin': pin } })
    .then((res) => {
      if (!res.ok) throw new Error('Erro ao baixar CSV');
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'transacoes.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    })
    .catch((err) => showToast({ type: 'error', text: err.message }));
}

function init() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('to').value = to.toISOString().slice(0, 10);
  document.getElementById('from').value = from.toISOString().slice(0, 10);
  const saved = sessionStorage.getItem('admin-pin');
  if (saved) document.getElementById('pin').value = saved;

  applyTheme();
  document.getElementById('btn-theme').addEventListener('click', toggleTheme);
  document.getElementById('btn-atualizar').addEventListener('click', fetchMetrics);
  document.getElementById('btn-csv').addEventListener('click', exportCSV);
}

document.addEventListener('DOMContentLoaded', init);
