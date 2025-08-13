const fetch = require('node-fetch');

// Base URL da API, lida da variável de ambiente
const API_URL = process.env.API_URL;

if (!API_URL) {
  console.error('Defina a variável de ambiente API_URL');
  process.exit(1);
}

(async () => {
  try {
    // 1. Cria uma transação
    const transacaoRes = await fetch(`${API_URL}/transacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cpf: '12345678900',
        plano: 'platinum',
        valor_original: 100,
        descricao: 'Assinatura Platinum'
      })
    });

    if (!transacaoRes.ok) {
      const txt = await transacaoRes.text();
      throw new Error(`Erro ao criar transação: ${transacaoRes.status} ${txt}`);
    }

    const transacao = await transacaoRes.json();
    const id = transacao.id;
    if (!id) throw new Error('Resposta de transação sem id');

    // 2. Cria o checkout do Mercado Pago usando o id como externalReference
    const checkoutRes = await fetch(`${API_URL}/mp/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ externalReference: id })
    });

    if (!checkoutRes.ok) {
      const txt = await checkoutRes.text();
      throw new Error(`Erro ao criar checkout: ${checkoutRes.status} ${txt}`);
    }

    const checkout = await checkoutRes.json();
    const link = checkout.init_point;
    if (!link) throw new Error('init_point não retornado');

    // 3. Exibe o link do checkout
    console.log('Checkout criado com sucesso:');
    console.log(link);
    process.exit(0);
  } catch (err) {
    console.error('Falha no teste:', err.message);
    process.exit(1);
  }
})();
