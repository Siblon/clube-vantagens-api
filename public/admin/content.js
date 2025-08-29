document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cadastro-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = document.getElementById('pin').value.trim();
    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    try {
      const res = await fetch('/admin/clientes?pin=' + encodeURIComponent(pin), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao cadastrar');
      }
      alert('Cliente cadastrado com sucesso!');
      form.reset();
    } catch (err) {
      alert('Erro: ' + err.message);
    }
  });
});
