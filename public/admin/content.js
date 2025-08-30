(function () {
  const form = document.getElementById('cadastro-form');
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('save-pin');

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

      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401 && data.error === 'invalid_pin') {
        alert('PIN inválido. Por favor, revise o PIN.');
        return;
      }
      if (!resp.ok) {
        alert(data.error || 'Erro ao cadastrar');
        return;
      }
      form.reset();
      alert('Cliente cadastrado!');
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar');
    }
  });
})();
