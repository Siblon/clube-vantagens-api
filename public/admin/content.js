import { sanitizeCpf, isValidCpf } from './cpf-utils.js';

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

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cpfInput = document.getElementById('cpf');
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const telefoneInput = document.getElementById('telefone');

    const cpf = sanitizeCpf(cpfInput.value);
    const nome = nomeInput.value.trim();
    const email = emailInput.value.trim();
    const telefone = telefoneInput.value.trim();

    if (!isValidCpf(cpf)) {
      showMessage('CPF inválido', 'error');
      return;
    }

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
}
