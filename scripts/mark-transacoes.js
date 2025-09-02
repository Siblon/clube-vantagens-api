#!/usr/bin/env node
const fetch = require('node-fetch');
const args = require('minimist')(process.argv.slice(2));
const API = process.env.API || 'https://clube-vantagens-api-production.up.railway.app';
const PIN = process.env.PIN || '2468';

const desde = args.desde || new Date(Date.now() - 3*864e5).toISOString().slice(0,10);
const ate   = args.ate   || new Date().toISOString().slice(0,10);
const status = args.status || 'pago';
const limit = Number(args.limit || 100);
const offset = Number(args.offset || 0);
const metodo = args.metodo || 'pix';
const obsBase = args.obs || `ajuste em lote (${status})`;

(async () => {
  try {
    const listUrl = `${API}/admin/transacoes?desde=${desde}&ate=${ate}&limit=${limit}&offset=${offset}`;
    const listRes = await fetch(listUrl, { headers: { 'x-admin-pin': PIN }});
    if (!listRes.ok) throw new Error(`List fail: ${listRes.status} ${await listRes.text()}`);
    const list = await listRes.json();
    const ids = (list.rows || []).map(r => r.id);
    console.log(`Encontradas ${ids.length} transações no período ${desde}..${ate}.`);

    let ok = 0, fail = 0;
    for (const id of ids) {
      const body = {
        status_pagamento: status,
        metodo_pagamento: metodo,
        observacoes: `${obsBase} - id ${id}`
      };
      const res = await fetch(`${API}/admin/transacoes/${id}`, {
        method: 'PATCH',
        headers: {
          'x-admin-pin': PIN,
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (res.ok) { ok++; process.stdout.write('.'); }
      else { fail++; process.stdout.write('x'); }
    }
    console.log(`\nFeito. OK=${ok} FAIL=${fail}`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
