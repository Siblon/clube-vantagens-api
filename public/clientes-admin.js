function toast(msg, type = 'info') {
  const box = document.getElementById('toasts');
  if (!box) return alert(msg);
  const el = document.createElement('div');
  el.className = `toast toast--${type}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function normalizeHeader(h) {
  return h
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const HEADER_MAP = {
  nome: 'nome',
  cpf: 'cpf',
  email: 'email',
  telefone: 'telefone',
  plano: 'plano',
  statuspagamento: 'status_pagamento',
  vencimento: 'vencimento'
};

let validRows = [];
let skipped = 0;
let errors = [];

function mapRow(row) {
  const out = {};
  for (const k in row) {
    const mapped = HEADER_MAP[normalizeHeader(k)];
    if (mapped) out[mapped] = row[k];
  }
  return out;
}

function parseCsv(text) {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  const rows = parsed.data.map(mapRow);
  const seen = new Set();
  validRows = [];
  skipped = 0;
  errors = [];

  rows.forEach((r, idx) => {
    const cpf = (r.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) {
      skipped++;
      errors.push({ index: idx, cpf, message: 'cpf inválido' });
      return;
    }
    if (seen.has(cpf)) {
      skipped++;
      errors.push({ index: idx, cpf, message: 'cpf duplicado' });
      return;
    }
    seen.add(cpf);

    let status = (r.status_pagamento || '').toString().trim().toLowerCase();
    const allowed = ['em dia', 'pendente', 'inadimplente'];
    if (!allowed.includes(status)) {
      skipped++;
      errors.push({ index: idx, cpf, message: 'status_pagamento inválido' });
      return;
    }

    let venc = (r.vencimento || '').toString().trim();
    if (venc) {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(venc)) {
        const [d, m, y] = venc.split('/');
        venc = `${y}-${m}-${d}`;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(venc)) {
        skipped++;
        errors.push({ index: idx, cpf, message: 'vencimento inválido' });
        return;
      }
    } else {
      venc = null;
    }

    validRows.push({
      cpf,
      nome: (r.nome || '').toString().trim(),
      email: (r.email || '').toString().trim(),
      telefone: (r.telefone || '').toString().trim(),
      plano: (r.plano || '').toString().trim(),
      status_pagamento: status,
      vencimento: venc
    });
  });
}

function renderPreview() {
  const box = document.getElementById('csv-preview');
  if (validRows.length === 0) {
    box.innerHTML = `<p>Nenhum registro válido. Ignorados: ${skipped}</p>`;
    document.getElementById('btn-import').disabled = true;
    return;
  }

  const rows = validRows
    .slice(0, 50)
    .map(
      r =>
        `<tr><td>${r.nome}</td><td>${r.cpf}</td><td>${r.email}</td><td>${r.telefone}</td><td>${r.plano}</td><td>${r.status_pagamento}</td><td>${r.vencimento || ''}</td></tr>`
    )
    .join('');
  box.innerHTML = `
    <p>Total válido: ${validRows.length} | Ignorados: ${skipped}</p>
    <table class="table">
      <thead>
        <tr><th>Nome</th><th>CPF</th><th>Email</th><th>Telefone</th><th>Plano</th><th>Status</th><th>Vencimento</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
  document.getElementById('btn-import').disabled = false;
}

async function onPreview() {
  const file = document.getElementById('csv-file').files[0];
  if (!file) {
    toast('Selecione um arquivo CSV', 'warn');
    return;
  }
  const text = await file.text();
  parseCsv(text);
  renderPreview();
}

async function onImport() {
  if (validRows.length === 0) {
    toast('Nada para importar', 'warn');
    return;
  }
  try {
    const r = await UI.adminFetch('/admin/clientes/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // O endpoint espera o campo `clientes`, não `rows`.
      body: JSON.stringify({ clientes: validRows })
    });
    if (!r.ok) {
      toast('Erro ao importar', 'error');
      return;
    }
    const j = await r.json();
    toast(
      `Inseridos: ${j.inserted} | Atualizados: ${j.updated} | Ignorados: ${j.skipped} | Erros: ${j.errors.length}`,
      'ok'
    );
  } catch (_e) {
    toast('Falha de rede', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-preview').addEventListener('click', onPreview);
  document.getElementById('btn-import').addEventListener('click', onImport);
});

