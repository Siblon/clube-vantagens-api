const fetch = require('node-fetch');

const API = process.env.API || 'https://clube-vantagens-api-production.up.railway.app';
const PIN = process.env.PIN || '2468';

const get = (path) => fetch(`${API}${path}`, { headers: { 'x-admin-pin': PIN }});
const json = async (res) => ({ status: res.status, body: await res.json() });

describe('Admin Transações (integração leve)', () => {
  jest.setTimeout(20000);

  test('lista no período', async () => {
    const res = await get('/admin/transacoes?desde=2025-09-01&ate=2025-09-03&limit=5&offset=0');
    const { body } = await json(res);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('rows');
  });

  test('resumo geral no período', async () => {
    const res = await get('/admin/transacoes/resumo?desde=2025-09-01&ate=2025-09-03');
    const { body } = await json(res);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('ok', true);
    expect(body).toHaveProperty('porStatus');
  });

  test('resumo pagos no período', async () => {
    const res = await get('/admin/transacoes/resumo?desde=2025-09-01&ate=2025-09-03&status=pago');
    const { body } = await json(res);
    expect(res.status).toBe(200);
    expect(body).toHaveProperty('ok', true);
    expect(body.porStatus).toHaveProperty('pago');
  });

  test('PATCH idempotente em um item (não muda o status atual)', async () => {
    // pega o primeiro id e mantém o mesmo status/metodo
    const list = await get('/admin/transacoes?desde=2025-09-01&ate=2025-09-03&limit=1&offset=0').then(json);
    const row = list.body.rows?.[0];
    if (!row) return; // nada para testar

    const payload = {
      status_pagamento: row.status_pagamento || 'pago',
      metodo_pagamento: row.metodo_pagamento || 'pix',
      observacoes: 'noop via teste'
    };
    const patch = await fetch(`${API}/admin/transacoes/${row.id}`, {
      method: 'PATCH',
      headers: { 'x-admin-pin': PIN, 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const j = await patch.json();
    expect(patch.status).toBe(200);
    expect(j).toHaveProperty('ok', true);
  });
});
