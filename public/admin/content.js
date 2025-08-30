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
      showMessage('PIN salvo!', 'success');
    });
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpf = document.getElementById('cpf').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    const payload = { cpf, nome };
    if (email) payload.email = email;
    if (telefone) payload.telefone = telefone;

    try {
      const resp = await fetch('/admin/clientes', {
        method: 'POST',
        headers: withPinHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });

      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        showMessage('PIN inválido', 'error');
        return;
      }
      if (!resp.ok) {
        showMessage(data.error || 'Erro ao cadastrar', 'error');
        return;
      }
      form.reset();
      showMessage('Ação concluída com sucesso');
    } catch (err) {
      showMessage(err.message || 'Erro ao cadastrar', 'error');
    }
  });
})();
