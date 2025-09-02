(() => {
  const state = {
    limit: 20,
    offset: 0,
    total: 0,
    rows: [],
    pin: localStorage.getItem('admin_pin') || '',
  };

  const el = (id) => document.getElementById(id);
  const fmtBRL = (n) => (typeof n === 'number' ? n : Number(n||0)).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmtDate = (s) => {
    if(!s) return '';
    const d = new Date(s);
    return d.toLocaleString('pt-BR');
  };
  const qs = (o) => Object.entries(o).filter(([,v])=>v!=='' && v!=null)
    .map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');

  const getPin = () => state.pin || el('pin').value.trim();
  const setPin = (pin) => { state.pin = pin; localStorage.setItem('admin_pin', pin); };

  const apiGet = async (path, params={}) => {
    const url = params && Object.keys(params).length ? `${path}?${qs(params)}` : path;
    const r = await fetch(url, { headers: { 'x-admin-pin': getPin() }});
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };
  const apiPatch = async (path, body) => {
    const r = await fetch(path, {
      method:'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': getPin() },
      body: JSON.stringify(body || {})
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  };

  function defaultPeriodo(){
    const hoje = new Date();
    const ate = hoje.toISOString().slice(0,10);
    const dd = new Date(hoje); dd.setDate(dd.getDate()-7);
    const desde = dd.toISOString().slice(0,10);
    el('f-desde').value ||= desde;
    el('f-ate').value ||= ate;
  }

  async function carregarResumo(){
    const p = filtros();
    const j = await apiGet('/admin/transacoes/resumo', p);
    renderKpis(j);
  }

  async function carregarTabela(){
    const p = { ...filtros(), limit: state.limit, offset: state.offset };
    const j = await apiGet('/admin/transacoes', p);
    state.rows = j.rows || [];
    state.total = j.total || 0;
    renderTabela();
    renderPag();
  }

  function filtros(){
    return {
      desde: el('f-desde').value,
      ate: el('f-ate').value,
      cpf: (el('f-cpf').value||'').replace(/\D+/g,''),
      status: el('f-status').value,
      metodo: el('f-metodo').value
    };
  }

  function renderKpis(j){
    const k = el('kpis');
    const porStatus = j.porStatus || {};
    k.innerHTML = `
      <div class="kpi"><span class="muted">Transações</span><b>${j.total}</b></div>
      <div class="kpi"><span class="muted">Soma Bruta</span><b>${fmtBRL(j.somaBruta||0)}</b></div>
      <div class="kpi"><span class="muted">Soma Final</span><b>${fmtBRL(j.somaFinal||0)}</b></div>
      <div class="kpi"><span class="muted">Desconto Total</span><b>${fmtBRL(j.descontoTotal||0)}</b></div>
      <div class="kpi"><span class="muted">Desc. Médio</span><b>${(j.descontoMedioPercent||0).toFixed(2)}%</b></div>
      <div class="kpi"><span class="muted">Ticket Médio</span><b>${fmtBRL(j.ticketMedio||0)}</b></div>
    `;
  }

  function statusBadge(s){
    const cls = s === 'pago' ? 'pago' : s === 'cancelado' ? 'cancelado' : 'pendente';
    return `<span class="status ${cls}">${s||'—'}</span>`;
  }

  function renderTabela(){
    const tb = el('tbody');
    tb.innerHTML = state.rows.map(r => `
      <tr>
        <td><input class="checkbox row-check" data-id="${r.id}" type="checkbox"/></td>
        <td>${r.id}</td>
        <td>${fmtDate(r.created_at)}</td>
        <td>${r.cpf || '—'}</td>
        <td>${fmtBRL(r.valor_original)}</td>
        <td>${typeof r.desconto_aplicado === 'string' ? r.desconto_aplicado : (r.desconto_aplicado ?? '—')}</td>
        <td>${fmtBRL(r.valor_final)}</td>
        <td>${statusBadge(r.status_pagamento || 'pendente')}</td>
        <td>${r.metodo_pagamento || '—'}</td>
        <td>
          <button class="btn primary" data-act="pagar" data-id="${r.id}">Pagar</button>
          <button class="btn warn" data-act="pendente" data-id="${r.id}">Pendente</button>
          <button class="btn danger" data-act="cancelar" data-id="${r.id}">Cancelar</button>
        </td>
      </tr>
    `).join('');
  }

  function renderPag(){
    const page = Math.floor(state.offset/state.limit)+1;
    const pages = Math.max(1, Math.ceil(state.total/state.limit));
    el('pag-info').textContent = `Página ${page} de ${pages}`;
  }

  async function buscar(){
    state.offset = 0;
    await Promise.all([carregarResumo(), carregarTabela()]);
  }

  async function mudarStatus(id, status){
    const body = { status_pagamento: status };
    if(status === 'pago') body.metodo_pagamento = 'pix';
    body.observacoes = 'alterado via painel';
    await apiPatch(`/admin/transacoes/${id}`, body);
  }

  async function massa(status){
    const ids = [...document.querySelectorAll('.row-check:checked')].map(i => i.dataset.id);
    if(ids.length===0){ alert('Selecione ao menos uma linha.'); return; }
    for (const id of ids) {
      try { await mudarStatus(id, status); } catch(e){ console.error(e); }
    }
    await buscar();
  }

  async function exportarCSV(){
    const p = filtros();
    const url = `/admin/transacoes/csv?${qs(p)}`;
    const r = await fetch(url, { headers: { 'x-admin-pin': getPin() }});
    if(!r.ok){ alert('Falha ao exportar CSV'); return; }
    const blob = await r.blob();
    const a = document.createElement('a');
    const d = p.desde || 'inicio';
    const atee = p.ate || 'hoje';
    a.href = URL.createObjectURL(blob);
    a.download = `transacoes_${d}_a_${atee}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // Eventos
  document.addEventListener('click', async (e) => {
    const t = e.target;
    if (t.id === 'btn-salvar-pin') {
      setPin(el('pin').value.trim());
      alert('PIN salvo!');
      return;
    }
    if (t.id === 'btn-buscar') { await buscar(); return; }
    if (t.id === 'btn-prev') { state.offset = Math.max(0, state.offset - state.limit); await carregarTabela(); return; }
    if (t.id === 'btn-next') { 
      const next = state.offset + state.limit;
      if (next < state.total) { state.offset = next; await carregarTabela(); }
      return;
    }
    if (t.id === 'btn-exportar') { await exportarCSV(); return; }
    if (t.id === 'btn-massa-pagar') { await massa('pago'); return; }
    if (t.id === 'btn-massa-pendente') { await massa('pendente'); return; }
    if (t.id === 'btn-massa-cancelar') { await massa('cancelado'); return; }

    // Ações por linha
    if (t.dataset && t.dataset.act && t.dataset.id) {
      const id = t.dataset.id;
      const act = t.dataset.act;
      const map = { pagar:'pago', pendente:'pendente', cancelar:'cancelado' };
      try {
        await mudarStatus(id, map[act]);
        await buscar();
      } catch(err){ console.error(err); alert('Falha ao atualizar.'); }
    }

    if (t.id === 'check-all'){
      const on = t.checked;
      document.querySelectorAll('.row-check').forEach(c => c.checked = on);
    }
  });

  // Inicialização
  window.addEventListener('load', async () => {
    defaultPeriodo();
    if (state.pin) el('pin').value = state.pin;
    await buscar();
  });
})();
