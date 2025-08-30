(function () {
  const form = document.getElementById('cadastro-form');
  const pinInput = document.getElementById('pin');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = (pinInput?.value || '2468').trim();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();

    try {
      const resp = await fetch(`/admin/clientes?pin=${encodeURIComponent(pin)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone })
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || !json.ok) throw new Error(json.error || `HTTP ${resp.status}`);

      alert('Cliente cadastrado com sucesso!');
      form.reset();
    } catch (err) {
      alert(`Erro ao cadastrar: ${err.message}`);
    }
  });
})();
