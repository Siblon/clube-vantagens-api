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
  const cpf = document.getElementById('cpf').value.trim();
  if (cpf) params.set('cpf', cpf);
  const plano = document.getElementById('plano').value;
  if (plano) params.set('plano', plano);
  return params.toString();
}

function formatBRL(n) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(n) || 0);
}

async function fetchResumo() {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const q = buildQuery();
  const res = await fetch(`/admin/relatorios/resumo?${q}`, {
    headers: { 'x-admin-pin': pin },
  });
  if (!res.ok) return alert('Erro ao gerar resumo');
  const data = await res.json();
  renderResumo(data);
}

async function downloadCSV() {
  const pin = getPin();
  if (!pin) return alert('Informe o PIN');
  const q = buildQuery();
  const res = await fetch(`/admin/relatorios/transacoes.csv?${q}`, {
    headers: { 'x-admin-pin': pin },
  });
  if (!res.ok) return alert('Erro ao baixar');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename="?([^";]+)"?/);
  a.download = m ? m[1] : 'transacoes.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function renderResumo(data) {
  document.getElementById('out-total').textContent = data.totalTransacoes;
  document.getElementById('out-bruto').textContent = formatBRL(data.totalBruto);
  document.getElementById('out-desc').textContent = formatBRL(data.totalDescontos);
  document.getElementById('out-liq').textContent = formatBRL(data.totalLiquido);

  const tbPlanos = document.querySelector('#tbl-planos tbody');
  tbPlanos.innerHTML = '';
  data.porPlano.forEach((p) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.plano}</td><td>${p.qtd}</td><td>${formatBRL(
      p.bruto
    )}</td><td>${formatBRL(p.descontos)}</td><td>${formatBRL(
      p.liquido
    )}</td>`;
    tbPlanos.appendChild(tr);
  });

  const tbClientes = document.querySelector('#tbl-clientes tbody');
  tbClientes.innerHTML = '';
  data.porCliente.forEach((c) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.cpf}</td><td>${c.nome}</td><td>${c.qtd}</td><td>${formatBRL(
      c.bruto
    )}</td><td>${formatBRL(c.descontos)}</td><td>${formatBRL(c.liquido)}</td>`;
    tbClientes.appendChild(tr);
  });
}

function init() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('to').value = to.toISOString().slice(0, 10);
  document.getElementById('from').value = from.toISOString().slice(0, 10);
  const saved = sessionStorage.getItem('admin-pin');
  if (saved) document.getElementById('pin').value = saved;
  document.getElementById('btn-resumo').addEventListener('click', fetchResumo);
  document.getElementById('btn-csv').addEventListener('click', downloadCSV);
}

document.addEventListener('DOMContentLoaded', init);
