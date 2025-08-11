(function(){
  const out = document.getElementById('out');
  const pinEl = document.getElementById('pin');
  const cpfEl = document.getElementById('cpf');
  const btnRun = document.getElementById('run');
  const btnCopy = document.getElementById('copy');

  const tests = [];
  function log(title, ok, detail){
    const div = document.createElement('div');
    div.className = 'check';
    div.innerHTML = `
      <div class="row">
        <strong>${title}</strong>
        <span class="tag ${ok?'pass':'fail'}">${ok?'PASS':'FAIL'}</span>
      </div>
      ${detail ? `<div class="muted" style="margin-top:6px">${detail}</div>` : ''}
    `;
    out.appendChild(div);
    tests.push({ title, ok, detail });
  }

  async function json(url, init={}){
    const r = await fetch(url, init);
    const t = await r.text();
    try { return { ok: r.ok, data: JSON.parse(t) }; }
    catch { return { ok: r.ok, data: t }; }
  }

  function normCpf(s){ return (s||'').replace(/\D/g,'').slice(0,11); }

  async function run(){
    tests.length = 0; out.innerHTML = '';
    const pin = pinEl.value.trim();

    // 1) /health via rewrite (Vercel → Railway)
    {
      const r = await json('/health');
      log('Rewrite /health → Railway', r.ok && r.data && r.data.ok === true, JSON.stringify(r.data));
    }

    // 2) /status/info direto
    {
      const r = await json('/status/info');
      log('API /status/info', r.ok && r.data && r.data.ok === true, JSON.stringify(r.data));
    }

    // 3) Supabase ping (rota admin)
    if(pin){
      const r = await json('/admin/status/ping-supabase', { headers: { 'x-admin-pin': pin }});
      log('Supabase ping (admin)', r.ok && r.data && r.data.ok === true, JSON.stringify(r.data));
    } else {
      log('Supabase ping (admin)', false, 'Informe o PIN admin para testar.');
    }

    // 4) Assinaturas por CPF (se informado)
    const cpf = normCpf(cpfEl.value);
    if(cpf.length === 11){
      const r = await json(`/assinaturas?cpf=${cpf}`);
      const ok = r.ok && r.data && (r.data.plano || r.data.cliente || r.data.status);
      log('Consulta de assinatura por CPF', !!ok, JSON.stringify(r.data));
    } else {
      log('Consulta de assinatura por CPF', false, 'CPF de teste não informado (opcional).');
    }

    // 5) Preview de transação (valor de R$ 1,23)
    {
      const r = await json('/transacao/preview?cpf=00000000000&valor=1.23');
      log('Preview de transação', r.ok, JSON.stringify(r.data));
    }
  }

  btnRun.addEventListener('click', run);
  btnCopy.addEventListener('click', ()=>{
    const txt = tests.map(t => `- ${t.ok?'[PASS]':'[FAIL]'} ${t.title}${t.detail?` → ${t.detail}`:''}`).join('\n');
    navigator.clipboard.writeText(txt).then(()=> alert('Relatório copiado!'));
  });
})();
