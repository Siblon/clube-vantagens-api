(() => {
  const NAV = [
    { id:'painel',      href:'/',                label:'Painel' },
    { id:'relatorios',  href:'/relatorios.html', label:'Relatórios' },
    { id:'etiquetas',   href:'/etiquetas.html',  label:'Etiquetas' },
    { id:'leads',       href:'/leads-admin.html',label:'Leads (Admin)' },
    { id:'clientes',    href:'/clientes-admin.html',label:'Clientes (Admin)' },
    { id:'config',      href:'/config.html',     label:'Config' }
  ];

  const ls = window.localStorage;
  function getPin(){ return ls.getItem('adminPin') || ''; }
  function setPin(v){ v ? ls.setItem('adminPin', v) : ls.removeItem('adminPin'); }
  async function adminFetch(url, opts = {}){
    const pin = getPin();
    const headers = new Headers(opts.headers || {});
    if(pin) headers.set('x-admin-pin', pin);
    return fetch(url, { ...opts, headers });
  }

  async function pingStatus(el){
    try{
      const r = await fetch('/health', { cache:'no-store' });
      const ok = r.ok;
      el.textContent = ok ? 'online' : 'instável';
      el.dataset.status = ok ? 'online' : 'warn';
      return ok;
    }catch(_){
      el.textContent = 'instável';
      el.dataset.status = 'warn';
      return false;
    }
  }

  function mountChrome({ active } = {}){
    const top = document.getElementById('topbar') || (() => {
      const h = document.createElement('header');
      h.id='topbar';
      document.body.prepend(h);
      return h;
    })();
    const foot = document.getElementById('site-footer') || (() => {
      const f = document.createElement('footer');
      f.id='site-footer';
      document.body.append(f);
      return f;
    })();

    top.innerHTML = `
      <div class="topbar">
        <div class="brand">
          <span class="dot"></span>
          <a class="brand-title" href="/">Clube de Vantagens</a>
        </div>
        <nav class="mainnav" aria-label="Principal">
          ${NAV.map(n=>`<a data-id="${n.id}" href="${n.href}">${n.label}</a>`).join('')}
        </nav>
        <div class="tools">
          <span id="status-badge" class="badge">instável</span>
          <a class="btn btn--ghost" href="#" id="btn-appearance">⚙ Aparência</a>
          <a class="btn btn--ghost" href="/config.html">⚙ Configurações</a>
        </div>
      </div>
    `;
    top.querySelectorAll('.mainnav a').forEach(a=>{
      if(a.dataset.id === active) a.classList.add('active');
    });

    const sb = document.getElementById('status-badge');
    pingStatus(sb);

    foot.innerHTML = `<div class="footer">v0.1.0 — Ambiente de Teste — Loja X</div>`;

    document.addEventListener('keydown', (e)=>{
      if(e.key==='/' && !e.target.closest('input,textarea')){
        const first = document.querySelector('input');
        if(first) first.focus();
        e.preventDefault();
      }
    });
  }

  function pinControls(container){
    container.innerHTML = `
      <div class="pinrow">
        <label for="pin-admin">PIN admin</label>
        <div class="pinbox">
          <input id="pin-admin" type="password" class="input" placeholder="****" value="${getPin()}" />
          <button id="pin-toggle" class="btn btn--ghost" type="button" title="Mostrar/ocultar">👁</button>
          <button id="pin-validate" class="btn btn--secondary" type="button">Validar PIN</button>
          <span id="pin-status" class="badge badge--muted">aguardando</span>
        </div>
      </div>
    `;
    const input = container.querySelector('#pin-admin');
    const toggle = container.querySelector('#pin-toggle');
    const btn = container.querySelector('#pin-validate');
    const b = container.querySelector('#pin-status');

    toggle.addEventListener('click', ()=>{
      input.type = input.type === 'password' ? 'text':'password';
    });
    input.addEventListener('change', ()=> setPin(input.value.trim()));
    btn.addEventListener('click', async ()=>{
      setPin(input.value.trim());
      b.textContent = 'validando...';
      b.className = 'badge';
      try{
        const r = await adminFetch('/admin/status/ping-supabase');
        const ok = r.ok;
        b.textContent = ok ? 'válido' : 'inválido';
        b.className = 'badge ' + (ok ? 'badge--ok':'badge--warn');
      }catch(_){
        b.textContent = 'erro';
        b.className = 'badge badge--warn';
      }
    });
  }

  window.UI = { mountChrome, pinControls, adminFetch, getPin, setPin };
})();
