(function () {
  const form = document.getElementById('cadastro-form');
  const pinInput = document.getElementById('pin');

  if (pinInput) {
    const storedPin = localStorage.getItem('ADMIN_PIN');
    if (storedPin) pinInput.value = storedPin;
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = (pinInput?.value || localStorage.getItem('ADMIN_PIN') || '2468').trim();
    localStorage.setItem('ADMIN_PIN', pin);
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
        alert(error);
      }
    } catch (err) {
      alert(err.message || 'Erro ao cadastrar');
    }
  });
})();
