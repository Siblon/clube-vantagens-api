const supabase = require('../supabaseClient');
const { assertSupabase } = require('../supabaseClient');

const DAY = 24 * 60 * 60 * 1000;
function parseISO(s) {
  try {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d;
  } catch (_) {
    return null;
  }
}
function periodFromQuery(q = {}) {
  const to = parseISO(q.to) || new Date();
  const from = parseISO(q.from) || new Date(to.getTime() - 30 * DAY);
  return { from, to };
}
function iso(d) {
  return d.toISOString();
}
function round(n) {
  return Number(Number(n).toFixed(2));
}

exports.resume = async (req, res) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);

  const { data: clientes, error: cliErr } = await supabase
    .from('clientes')
    .select('status');
  if (cliErr) return res.status(500).json({ error: cliErr.message });
  let ativos = 0;
  let inativos = 0;
  (clientes || []).forEach((c) => {
    if (c.status === 'ativo') ativos += 1;
    else inativos += 1;
  });

  const { data: txs, error: txErr } = await supabase
    .from('transacoes')
    .select('id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final')
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));
  if (txErr) return res.status(500).json({ error: txErr.message });

  let bruto = 0;
  let descontos = 0;
  let liquido = 0;
  const planos = {};
  const dias = {};
  const clientesMap = {};

  (txs || []).forEach((tx) => {
    const b = Number(tx.valor_bruto) || 0;
    const l = Number(tx.valor_final) || 0;
    const d = Number(tx.desconto_aplicado) || b - l;
    bruto += b;
    descontos += d;
    liquido += l;

    if (!planos[tx.plano])
      planos[tx.plano] = { plano: tx.plano, qtd: 0, bruto: 0, descontos: 0, liquido: 0 };
    const p = planos[tx.plano];
    p.qtd++;
    p.bruto += b;
    p.descontos += d;
    p.liquido += l;

    const day = tx.created_at.slice(0, 10);
    if (!dias[day]) dias[day] = { date: day, qtd: 0, liquido: 0 };
    dias[day].qtd++;
    dias[day].liquido += l;

    if (!clientesMap[tx.cpf])
      clientesMap[tx.cpf] = { cpf: tx.cpf, nome: tx.cliente_nome, qtd: 0, bruto: 0, descontos: 0, liquido: 0 };
    const c = clientesMap[tx.cpf];
    c.qtd++;
    c.bruto += b;
    c.descontos += d;
    c.liquido += l;
  });

  const porPlano = Object.values(planos).map((p) => ({
    plano: p.plano,
    qtd: p.qtd,
    bruto: round(p.bruto),
    descontos: round(p.descontos),
    liquido: round(p.liquido),
  }));

  const porDia = [];
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const obj = dias[date] || { date, qtd: 0, liquido: 0 };
    porDia.push({ date: obj.date, qtd: obj.qtd, liquido: round(obj.liquido) });
  }

  const topClientes = Object.values(clientesMap)
    .map((c) => ({
      cpf: c.cpf,
      nome: c.nome,
      qtd: c.qtd,
      bruto: round(c.bruto),
      descontos: round(c.descontos),
      liquido: round(c.liquido),
    }))
    .sort((a, b) => b.liquido - a.liquido)
    .slice(0, 5);

  return res.json({
    periodo: { from: iso(from), to: iso(to) },
    clientes: { ativos, inativos, total: ativos + inativos },
    totais: {
      qtdTransacoes: (txs || []).length,
      bruto: round(bruto),
      descontos: round(descontos),
      liquido: round(liquido),
    },
    porPlano,
    porDia,
    topClientes,
  });
};

exports.csv = async (req, res) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);
  const { data, error } = await supabase
    .from('transacoes')
    .select('id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final')
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));
  if (error) return res.status(500).json({ error: error.message });

  const header = 'id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final';
  const escape = (v) => {
    if (v === null || v === undefined) return '""';
    return '"' + String(v).replace(/"/g, '""') + '"';
    };
  const lines = (data || []).map((row) =>
    [
      row.id,
      row.created_at,
      row.cpf,
      escape(row.cliente_nome),
      escape(row.plano),
      row.valor_bruto,
      row.desconto_aplicado,
      row.valor_final,
    ].join(',')
  );
  const csv = [header, ...lines].join('\n');
  const pad = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="transacoes-${pad(from)}-${pad(to)}.csv"`);
  res.send(csv);
};

module.exports = {
  resume: exports.resume,
  csv: exports.csv,
};
