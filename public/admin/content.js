(function () {
  const form = document.getElementById('cadastro-form');
  const pinInput = document.getElementById('pin');
  const saveBtn = document.getElementById('save-pin');

  if (pinInput) {
    const storedPin = getPin();
    if (storedPin) pinInput.value = storedPin;
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      setPin(pinInput.value.trim());
      alert('PIN salvo!');
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    try {
      const resp = await fetch('/admin/clientes', {
        method: 'POST',
        headers: withPinHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ nome, email, telefone })
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        alert('PIN inválido. Ajuste o PIN no topo e tente novamente.');
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
