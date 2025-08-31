const fetch = require('node-fetch');

const MP_API = 'https://api.mercadopago.com';
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

function authHeaders() {
  if (!ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN not configured');
  return {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

// cria preferência simples (PIX/checkout)
async function createPreference({ title, description, amount, external_reference }) {
  const body = {
    items: [{ title, description, quantity: 1, unit_price: Number(amount), currency_id: 'BRL' }],
    back_urls: { success: 'https://clube-vantagens-api-production.up.railway.app/admin/clientes.html' },
    auto_return: 'approved',
    external_reference,
    payment_methods: {
      excluded_payment_types: [],
      installments: 1
    }
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MP createPreference failed: ${res.status} ${t}`);
  }
  return res.json();
}

// consulta pagamento por id
async function getPayment(paymentId) {
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, { headers: authHeaders() });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`MP getPayment failed: ${res.status} ${t}`);
  }
  return res.json();
}

module.exports = { createPreference, getPayment };
