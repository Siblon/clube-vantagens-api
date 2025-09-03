/**
 * Testes de integração (remotos) para a API de transações admin.
 * Requer Node 18+ (fetch nativo).
 *
 * Como define o alvo:
 *  - API base: via env API (ex.: https://clube-vantagens-api-production.up.railway.app)
 *  - PIN admin: via env PIN  (ex.: 2468)
 * Defaults seguros para teu projeto:
 *  - API padrão: produção do Railway
 *  - PIN padrão: 2468
 *
 * Esses testes:
 *  - NÃO assumem dados fixos, mas usam o período onde você já gerou transações (01–03/09/2025)
 *  - Se não houver transação para patch, criam uma (POST /transacao)
 *  - Mudam status de 1 transação (voltam ao status original ao final)
 */

const API = process.env.API || 'https://clube-vantagens-api-production.up.railway.app';
const PIN = process.env.PIN || '2468';

const PERIOD_DESDE = '2025-09-01';
const PERIOD_ATE   = '2025-09-03';

const headersJson = {
  'Content-Type': 'application/json',
  'x-admin-pin': PIN,
};
const headersPinOnly = { 'x-admin-pin': PIN };

const apiGetJson = async (path, params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v!=='' && v!=null));
  const url = q.toString() ? `${API}${path}?${q}` : `${API}${path}`;
  const r = await fetch(url, { headers: headersPinOnly });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};

const apiPatchJson = async (path, body) => {
  const r = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: headersJson,
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};

const apiPostJson = async (path, body, withPinHeader = true) => {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: withPinHeader ? headersJson : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};

const apiGetCsv = async (path, params = {}) => {
  const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v!=='' && v!=null));
  const url = q.toString() ? `${API}${path}?${q}` : `${API}${path}`;
  const r = await fetch(url, { headers: headersPinOnly });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const text = await r.text();
  return { text, contentType: r.headers.get('content-type') || '' };
};

jest.setTimeout(30000);

const run = process.env.RUN_REMOTE_TESTS === '1' ? describe : describe.skip;

run('Admin Transações (integração remota)', () => {
  test('GET /admin/transacoes (lista paginada) responde OK e estrutura básica', async () => {
    const j = await apiGetJson('/admin/transacoes', {
      desde: PERIOD_DESDE, ate: PERIOD_ATE, limit: 5, offset: 0,
    });
    expect(j).toBeTruthy();
    expect(Array.isArray(j.rows)).toBe(true);
    expect(typeof j.total).toBe('number');
    if (j.rows[0]) {
      expect(j.rows[0]).toHaveProperty('id');
      expect(j.rows[0]).toHaveProperty('cpf');
      expect(j.rows[0]).toHaveProperty('valor_original');
      expect(j.rows[0]).toHaveProperty('valor_final');
    }
  });

  test('GET /admin/transacoes/resumo retorna KPIs com números', async () => {
    const j = await apiGetJson('/admin/transacoes/resumo', {
      desde: PERIOD_DESDE, ate: PERIOD_ATE,
    });
    expect(j).toHaveProperty('total');
    expect(j).toHaveProperty('somaBruta');
    expect(j).toHaveProperty('somaFinal');
    expect(j).toHaveProperty('descontoTotal');
    expect(j).toHaveProperty('descontoMedioPercent');
    expect(j).toHaveProperty('ticketMedio');
    // Todos deveriam ser números (mesmo que 0)
    for (const k of ['total','somaBruta','somaFinal','descontoTotal','descontoMedioPercent','ticketMedio']){
      expect(typeof j[k]).toBe('number');
    }
  });

  test('PATCH /admin/transacoes/:id alterna status (pendente <-> pago)', async () => {
    // pega um id do período; se não tiver, cria uma transação de teste
    let list = await apiGetJson('/admin/transacoes', {
      desde: PERIOD_DESDE, ate: PERIOD_ATE, limit: 1, offset: 0,
    });
    let row = list.rows[0];

    if (!row) {
      // cria uma transação fake p/ teste
      const criado = await apiPostJson('/transacao', {
        cpf: '52998224725',
        valor: 123.45,
        metodo_pagamento: 'pix',
        status_pagamento: 'pendente',
        observacoes: 'criado automaticamente pelo teste',
      }, true);
      // algumas versões retornam { ok:true, id, ... } e outras {id,...}
      const newId = criado.id || (criado.data && criado.data.id);
      expect(newId).toBeTruthy();

      list = await apiGetJson('/admin/transacoes', {
        desde: PERIOD_DESDE, ate: PERIOD_ATE, limit: 1, offset: 0,
      });
      row = list.rows[0];
    }

    const id = row.id;
    const original = row.status_pagamento || 'pendente';
    const target = original === 'pago' ? 'pendente' : 'pago';

    // muda p/ target
    const r1 = await apiPatchJson(`/admin/transacoes/${id}`, {
      status_pagamento: target,
      metodo_pagamento: target === 'pago' ? 'pix' : undefined,
      observacoes: 'alterado via teste automático',
    });
    expect(r1).toHaveProperty('ok', true);
    expect(r1.data).toBeTruthy();
    expect(r1.data.status_pagamento).toBe(target);

    // volta p/ original (limpeza)
    const r2 = await apiPatchJson(`/admin/transacoes/${id}`, {
      status_pagamento: original,
      metodo_pagamento: original === 'pago' ? 'pix' : undefined,
      observacoes: 'rollback teste automático',
    });
    expect(r2).toHaveProperty('ok', true);
    expect(r2.data.status_pagamento).toBe(original);
  });

  test('GET /admin/transacoes/csv retorna CSV texto com cabeçalho', async () => {
    const { text, contentType } = await apiGetCsv('/admin/transacoes/csv', {
      desde: PERIOD_DESDE, ate: PERIOD_ATE,
    });
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
    expect(contentType.toLowerCase()).toContain('text/csv');
    const header = text.split('\n')[0].trim().toLowerCase();
    // cabeçalho deve ter pelo menos id e cpf
    expect(header).toContain('id');
    expect(header).toContain('cpf');
  });
});

