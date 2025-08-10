const supabase = require('../supabaseClient');

const DAY = 24 * 60 * 60 * 1000;
function parseISOorNull(s) {
  try {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d) ? null : d;
  } catch (_) {
    return null;
  }
}
function periodFromQuery(q) {
  const to = parseISOorNull(q.to) || new Date();
  const from = parseISOorNull(q.from) || new Date(to.getTime() - 30 * DAY);
  return { from, to };
}
function asISOdate(d) {
  return d.toISOString();
}

exports.resumo = async (req, res) => {
  const { from, to } = periodFromQuery(req.query);
  const { data, error } = await supabase
    .from('transacoes')
    .select('cpf,cliente_nome,plano,valor_bruto,valor_final')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());
  if (error) return res.status(500).json({ error: error.message });

  const totalTransacoes = data.length;
  let totalBruto = 0;
  let totalLiquido = 0;
  let totalDescontos = 0;
  const planos = {};
  const clientes = {};

  for (const tx of data) {
    const bruto = Number(tx.valor_bruto) || 0;
    const liquido = Number(tx.valor_final) || 0;
    const desconto = bruto - liquido;

    totalBruto += bruto;
    totalLiquido += liquido;
    totalDescontos += desconto;

    if (!planos[tx.plano])
      planos[tx.plano] = {
        plano: tx.plano,
        qtd: 0,
        bruto: 0,
        descontos: 0,
        liquido: 0,
      };
    const p = planos[tx.plano];
    p.qtd++;
    p.bruto += bruto;
    p.descontos += desconto;
    p.liquido += liquido;

    if (!clientes[tx.cpf])
      clientes[tx.cpf] = {
        cpf: tx.cpf,
        nome: tx.cliente_nome,
        qtd: 0,
        bruto: 0,
        descontos: 0,
        liquido: 0,
      };
    const c = clientes[tx.cpf];
    c.qtd++;
    c.bruto += bruto;
    c.descontos += desconto;
    c.liquido += liquido;
  }

  const round = (n) => Number(n.toFixed(2));
  const porPlano = Object.values(planos).map((p) => ({
    plano: p.plano,
    qtd: p.qtd,
    bruto: round(p.bruto),
    descontos: round(p.descontos),
    liquido: round(p.liquido),
  }));
  const porCliente = Object.values(clientes).map((c) => ({
    cpf: c.cpf,
    nome: c.nome,
    qtd: c.qtd,
    bruto: round(c.bruto),
    descontos: round(c.descontos),
    liquido: round(c.liquido),
  }));

  return res.json({
    periodo: { from: asISOdate(from), to: asISOdate(to) },
    totalTransacoes,
    totalBruto: round(totalBruto),
    totalDescontos: round(totalDescontos),
    totalLiquido: round(totalLiquido),
    porPlano,
    porCliente,
  });
};

exports.csv = async (req, res) => {
  const { from, to } = periodFromQuery(req.query);
  const q = supabase
    .from('transacoes')
    .select(
      'id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final,origem'
    )
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  if (req.query.cpf) q.eq('cpf', req.query.cpf);
  if (req.query.plano) q.eq('plano', req.query.plano);

  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });

  const header =
    'id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final,origem';
  const escape = (v) => {
    if (v === null || v === undefined) return '""';
    return '"' + String(v).replace(/"/g, '""') + '"';
  };
  const lines = data.map((row) =>
    [
      row.id,
      row.created_at,
      row.cpf,
      escape(row.cliente_nome),
      escape(row.plano),
      row.valor_bruto,
      row.desconto_aplicado,
      row.valor_final,
      escape(row.origem),
    ].join(',')
  );
  const csv = [header, ...lines].join('\n');

  const pad = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="transacoes-${pad(from)}-${pad(to)}.csv"`
  );
  res.send(csv);
};

module.exports = {
  DAY,
  parseISOorNull,
  periodFromQuery,
  asISOdate,
  resumo: exports.resumo,
  csv: exports.csv,
};
