(function(){
  const csvText = document.getElementById('csv-text');
  const csvFile = document.getElementById('csv-file');
  const previewBtn = document.getElementById('preview-btn');
  const importBtn = document.getElementById('import-btn');
  const genIdsBtn = document.getElementById('generate-ids-btn');
  const limitChk = document.getElementById('limit200');
  const tbody = document.querySelector('#preview tbody');
  const statusDiv = document.getElementById('status');
  const msg = document.getElementById('mensagens');
  const countTotal = document.getElementById('count-total');
  const countValid = document.getElementById('count-valid');
  const countInvalid = document.getElementById('count-invalid');
  const countDup = document.getElementById('count-duplicates');
  const pinInput = document.getElementById('pin');
  const savePinBtn = document.getElementById('save-pin');

  let validRows = [];

  pinInput.value = getPin();
  savePinBtn.addEventListener('click', () => {
    setPin(pinInput.value.trim());
    alert('PIN salvo!');
  });

  function setState(text, loading){
    statusDiv.textContent = text;
    previewBtn.disabled = loading;
    importBtn.disabled = loading || validRows.length === 0;
    genIdsBtn.disabled = loading;
  }

  function sanitizeCpf(s=''){
    return (s.match(/\d/g)||[]).join('');
  }

  const PLANOS = new Set(['Mensal','Semestral','Anual']);
  const STATUS = new Set(['ativo','inativo']);
  const METODOS = new Set(['pix','cartao_debito','cartao_credito','dinheiro']);

  function parseCliente(raw={}){
    const errors = [];
    const cpf = sanitizeCpf(raw.cpf || '');
    const nome = (raw.nome || '').toString().trim();
    const plano = raw.plano;
    const status = raw.status;
    const metodo_pagamento = (raw.metodo_pagamento || '').toString().trim();
    let pagamento_em_dia = raw.pagamento_em_dia;
    let vencimento = raw.vencimento;

    if(!cpf || cpf.length !== 11) errors.push('cpf inválido');
    if(!nome) errors.push('nome obrigatório');
    if(!PLANOS.has(plano)) errors.push('plano inválido');
    if(!STATUS.has(status)) errors.push('status inválido');
    if(!METODOS.has(metodo_pagamento)) errors.push('metodo_pagamento inválido');

    if(pagamento_em_dia !== undefined){
      pagamento_em_dia = pagamento_em_dia === true || pagamento_em_dia === 'true' || pagamento_em_dia === 1 || pagamento_em_dia === '1';
    }

    if(vencimento){
      if(/^\d{2}\/\d{2}\/\d{4}$/.test(vencimento)){
        const [d,m,y] = vencimento.split('/');
        vencimento = `${y}-${m}-${d}`;
      }
      if(!/^\d{4}-\d{2}-\d{2}$/.test(vencimento)){
        errors.push('vencimento inválido');
      }
    }

    return { ok: errors.length === 0, data: { cpf, nome, plano, status, metodo_pagamento, pagamento_em_dia, vencimento }, errors };
  }

  function parseCsv(text){
    const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    if(!lines.length) return [];
    const headers = lines.shift().split(',').map(h=>h.trim().toLowerCase());
    const map = {};
    headers.forEach((h,i)=>{ map[h] = i; });
    const cols = ['cpf','nome','plano','status','metodo_pagamento','pagamento_em_dia','vencimento'];
    return lines.map(line => {
      const parts = line.split(',');
      const obj = {};
      cols.forEach(col => {
        const idx = map[col];
        if(idx !== undefined) obj[col] = parts[idx] ? parts[idx].trim() : '';
      });
      return obj;
    });
  }

  async function doPreview(){
    setState('Pré-visualizando…', true);
    msg.textContent='';
    tbody.innerHTML='';
    countTotal.textContent = countValid.textContent = countInvalid.textContent = countDup.textContent = '0';
    validRows = [];
    try{
      const text = csvFile.files[0] ? await csvFile.files[0].text() : csvText.value;
      const raws = parseCsv(text);
      const seen = new Set();
      let total=0, valid=0, invalid=0, duplicates=0;
      const preview = [];
      raws.forEach(raw => {
        const v = parseCliente(raw);
        total++;
        const cpf = v.data.cpf;
        let status;
        if(!v.ok){ invalid++; status='invalid'; }
        else if(seen.has(cpf)){ duplicates++; status='duplicate'; }
        else { seen.add(cpf); valid++; validRows.push(v.data); status='valid'; }
        preview.push({ ...v.data, _status: status });
      });
      countTotal.textContent = total;
      countValid.textContent = valid;
      countInvalid.textContent = invalid;
      countDup.textContent = duplicates;
      preview.slice(0,20).forEach(r => {
        const tr = document.createElement('tr');
        if(r._status !== 'valid'){
          tr.style.background = r._status === 'duplicate' ? '#ffd' : '#fdd';
        }
        tr.innerHTML = `<td>${r.cpf||''}</td><td>${r.nome||''}</td><td>${r.plano||''}</td><td>${r.status||''}</td><td>${r.metodo_pagamento||''}</td><td>${r.pagamento_em_dia!==undefined?r.pagamento_em_dia:''}</td><td>${r.vencimento||''}</td>`;
        tbody.appendChild(tr);
      });
      setState('Pré-visualização pronta', false);
    }catch(err){
      msg.textContent = err.message || 'Erro ao ler CSV';
      setState('Erro', false);
    }
  }

  async function doImport(){
    setState('Importando…', true);
    msg.textContent='';
    try{
      const lista = limitChk.checked ? validRows.slice(0,200) : validRows;
      const resp = await fetch('/admin/clientes:bulk', {
        method:'POST',
        headers: withPinHeaders({ 'Content-Type':'application/json' }),
        body: JSON.stringify({ clientes: lista })
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){
        msg.textContent = 'PIN inválido';
      }else if(!resp.ok){
        msg.textContent = data.error || 'Erro ao importar';
      }else{
        msg.textContent = JSON.stringify(data, null, 2);
      }
    }catch(err){
      msg.textContent = err.message || 'Erro ao importar';
    }finally{
      setState('Pronto', false);
    }
  }

  async function generateIds(){
    setState('Gerando IDs…', true);
    msg.textContent='';
    try{
      const resp = await fetch('/admin/clientes:generate-ids', {
        method:'POST',
        headers: withPinHeaders()
      });
      const data = await resp.json().catch(()=>({}));
      if(resp.status === 401){
        msg.textContent = 'PIN inválido';
      }else if(!resp.ok){
        msg.textContent = data.error || 'Erro ao gerar IDs';
      }else{
        msg.textContent = JSON.stringify(data, null, 2);
      }
    }catch(err){
      msg.textContent = err.message || 'Erro ao gerar IDs';
    }finally{
      setState('Pronto', false);
    }
  }

  previewBtn.addEventListener('click', doPreview);
  importBtn.addEventListener('click', doImport);
  genIdsBtn.addEventListener('click', generateIds);
})();
