(function () {
  const form = document.getElementById('cadastro-form');
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('save-pin');

  function getPin(){
    let pin = localStorage.getItem('ADMIN_PIN');
    if(!pin){
      pin = prompt('Informe o PIN do admin');
      if(pin) localStorage.setItem('ADMIN_PIN', pin);
    }
    return pin || '';
  }

  if (pinInput) {
    const storedPin = localStorage.getItem('ADMIN_PIN');
    if (storedPin) pinInput.value = storedPin;
  }
  if(saveBtn){
    saveBtn.addEventListener('click',()=>{
      const val = pinInput.value.trim();
      localStorage.setItem('ADMIN_PIN', val);
      alert('PIN salvo!');
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = getPin();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    try {
      const resp = await fetch('/admin/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
        body: JSON.stringify({ nome, email, telefone })
      });

      if (resp.ok) {
        form.reset();
        alert('Cliente cadastrado!');
      } else {
        const { error } = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }));
        if(resp.status===401) alert('PIN inválido');
        else alert(error);
      }
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar');
    }
  });
})();
