(function () {
  const csvText = document.getElementById('csv-text');
  const csvFile = document.getElementById('csv-file');
  const limitChk = document.getElementById('limit200');
  const previewBtn = document.getElementById('btn-preview');
  const importBtn = document.getElementById('btn-import');
  const previewDiv = document.getElementById('preview');
  const resultDiv = document.getElementById('result');
  const pinInput = document.getElementById('pin');
  const savePinBtn = document.getElementById('save-pin');

  pinInput.value = getPin();
  savePinBtn.addEventListener('click', () => {
    setPin(pinInput.value.trim());
    showMessage('PIN salvo!');
  });

  function parseCSV(text) {
    text = (text || '').replace(/^\uFEFF/, '').trim();
    if (!text) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const headers = lines.shift().split(',').map(h => h.trim());
    return lines.map(line => {
      const cols = line.split(',');
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (cols[i] || '').trim();
      });
      return obj;
    });
  }

  function sanitizeCpf(s) {
    return (s.match(/\d/g) || []).join('').slice(0, 11);
  }

  let validRows = [];

  async function doPreview() {
    try {
      importBtn.disabled = true;
      previewDiv.textContent = 'Carregando...';
      resultDiv.textContent = '';
      validRows = [];
      let text = csvText.value;
      if (csvFile.files[0]) {
        text = await csvFile.files[0].text();
        csvText.value = text;
      }
      let rows = parseCSV(text).map(r => ({
        cpf: sanitizeCpf(r.cpf || ''),
        nome: r.nome || '',
        plano: r.plano || '',
        status: r.status || '',
        metodo_pagamento: r.metodo_pagamento || '',
        email: r.email || '',
        telefone: r.telefone || '',
        vencimento: r.vencimento || ''
      }));
      if (limitChk.checked) rows = rows.slice(0, 200);
      const seen = new Set();
      let total = rows.length;
      let valid = 0;
      let invalid = 0;
      let duplicates = 0;
      const tableRows = [];
      rows.forEach(r => {
        const cpfOk = r.cpf.length === 11;
        if (!cpfOk) {
          invalid++;
        } else if (seen.has(r.cpf)) {
          duplicates++;
        } else {
          seen.add(r.cpf);
          valid++;
          validRows.push(r);
        }
        tableRows.push(`<tr><td>${r.cpf}</td><td>${r.nome}</td><td>${r.plano}</td><td>${r.status}</td><td>${r.metodo_pagamento}</td><td>${r.email}</td><td>${r.telefone}</td><td>${r.vencimento}</td></tr>`);
      });
      const tableHtml = `<table><thead><tr><th>CPF</th><th>Nome</th><th>Plano</th><th>Status</th><th>Método</th><th>Email</th><th>Telefone</th><th>Vencimento</th></tr></thead><tbody>${tableRows.slice(0,20).join('')}</tbody></table>`;
      previewDiv.innerHTML = `<p>Pronto para importar: ${valid} válidos, ${invalid} inválidos, ${duplicates} duplicados (no arquivo)</p>${tableHtml}`;
      importBtn.disabled = valid === 0;
    } catch (err) {
      previewDiv.textContent = '';
      showMessage('Erro no preview: ' + err.message, 'error');
    }
  }

  async function doImport() {
    try {
      resultDiv.textContent = 'Importando...';
      const resp = await fetch('/admin/clientes/bulk', {
        method: 'POST',
        headers: withPinHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ clientes: validRows })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        showMessage(data.error || 'Erro no import', 'error');
        resultDiv.textContent = '';
      } else {
        resultDiv.textContent = `Inseridos: ${data.inserted}, Atualizados: ${data.updated}, Inválidos: ${data.invalid}, Duplicados: ${data.duplicates}`;
        showMessage('Importação concluída');
      }
    } catch (err) {
      showMessage('Erro no import: ' + err.message, 'error');
      resultDiv.textContent = '';
    }
  }

  previewBtn.addEventListener('click', doPreview);
  importBtn.addEventListener('click', doImport);
})();
