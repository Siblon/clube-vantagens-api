function applyTheme(theme){
  const t = theme || localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('theme', t);
}
function toggleTheme(){
  const current = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
function showToast({type='info', text=''}){
  const container = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = text;
  container.appendChild(el);
  setTimeout(()=>el.remove(),3000);
}

function getPin() {
  return UI.getPin();
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
  if (!pin) return showToast({type:'error', text:'Informe o PIN'});
  const q = buildQuery();
  setLoadingSummary(true);
  setLoadingTable(true);
  try{
    const res = await UI.adminFetch(`/admin/relatorios/resumo?${q}`);
    if (!res.ok) throw new Error('Erro ao gerar resumo');
    const data = await res.json();
    renderResumo(data);
  } catch(err){
    showToast({type:'error', text: err.message});
  } finally {
    setLoadingSummary(false);
    setLoadingTable(false);
  }
}

async function downloadCSV() {
  const pin = getPin();
  if (!pin) return showToast({type:'error', text:'Informe o PIN'});
  const q = buildQuery();
  const res = await UI.adminFetch(`/admin/relatorios/transacoes.csv?${q}`);
  if (!res.ok) return showToast({type:'error', text:'Erro ao baixar'});
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

function setLoadingSummary(isLoading){
  const card = document.getElementById('cards');
  if(isLoading) card.classList.add('skeleton');
  else card.classList.remove('skeleton');
}
function setLoadingTable(isLoading){
  const tbPlanos = document.querySelector('#tbl-planos tbody');
  const tbClientes = document.querySelector('#tbl-clientes tbody');
  if(isLoading){
    tbPlanos.innerHTML = '<tr class="skeleton"><td colspan="5">&nbsp;</td></tr>';
    tbClientes.innerHTML = '<tr class="skeleton"><td colspan="6">&nbsp;</td></tr>';
  } else {
    tbPlanos.innerHTML = '';
    tbClientes.innerHTML = '';
  }
}

function init() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  document.getElementById('to').value = to.toISOString().slice(0, 10);
  document.getElementById('from').value = from.toISOString().slice(0, 10);
  applyTheme();
  document.getElementById('btn-appearance').addEventListener('click', (e)=>{ e.preventDefault(); toggleTheme(); });
  document.getElementById('btn-resumo').addEventListener('click', fetchResumo);
  document.getElementById('btn-csv').addEventListener('click', downloadCSV);
}

document.addEventListener('DOMContentLoaded', init);
