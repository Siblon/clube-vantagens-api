(function(){
  const $ = (q) => document.querySelector(q);
  const btnAplicar = $('#btn-aplicar');
  const btnCsv = $('#btn-csv');

  function getFilters(){
    const p = new URLSearchParams();
    const status = $('#f-status').value;
    const plano = $('#f-plano').value;
    const metodo = $('#f-metodo').value;
    const from = $('#f-from').value;
    const to = $('#f-to').value;
    if(status) p.set('status', status);
    if(plano) p.set('plano', plano);
    if(metodo) p.set('metodo', metodo);
    if(from) p.set('from', from);
    if(to) p.set('to', to);
    return p;
  }

  function fillTable(id, obj){
    const tb = document.querySelector(id + ' tbody');
    const rows = Object.entries(obj || {}).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    tb.innerHTML = rows || '<tr><td colspan="2">—</td></tr>';
  }

  function showLoading(flag){
    btnAplicar.disabled = btnCsv.disabled = flag;
  }

  function showEmpty(){
    $('#s-total').textContent = '0';
    $('#s-ativos').textContent = '0';
    $('#s-inativos').textContent = '0';
    fillTable('#tblPlano', {});
    fillTable('#tblMetodo', {});
  }

  function showError(msg){
    showMessage(msg, 'error');
  }

  async function loadSummary(){
    if(!getPin()){ showError('Informe o PIN no topo e clique em Salvar.'); return; }
    showLoading(true);
    try{
      const params = getFilters();
      const resp = await fetch('/admin/report/summary?' + params.toString(), withPinHeaders());
      if(resp.status === 401){ showError('Informe o PIN no topo e clique em Salvar.'); showEmpty(); return; }
      if(!resp.ok) throw new Error('HTTP '+resp.status);
      const json = await resp.json();
      $('#s-total').textContent = json.total;
      $('#s-ativos').textContent = json.ativos;
      $('#s-inativos').textContent = json.inativos;
      fillTable('#tblPlano', json.porPlano);
      fillTable('#tblMetodo', json.porMetodo);
      if(json.total === 0) showEmpty();
    }catch(err){
      showError('Falha ao carregar');
      showEmpty();
    }finally{
      showLoading(false);
    }
  }

  async function downloadCsv(){
    if(!getPin()){ showError('Informe o PIN no topo e clique em Salvar.'); return; }
    const params = getFilters();
    params.set('export_all','1');
    showLoading(true);
    try{
      const resp = await fetch('/admin/report/csv?' + params.toString(), withPinHeaders());
      if(resp.status === 401){ showError('Informe o PIN no topo e clique em Salvar.'); return; }
      if(!resp.ok){
        const txt = await resp.text().catch(()=> '');
        try{ const j = JSON.parse(txt); showError(j.error || 'Falha ao exportar'); }
        catch{ showError('Falha ao exportar'); }
        return;
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `relatorio-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch(err){
      showError('Falha ao exportar');
    }finally{
      showLoading(false);
    }
  }

  btnAplicar.addEventListener('click', loadSummary);
  btnCsv.addEventListener('click', downloadCsv);
  loadSummary();
})();
