const supabase = require('../supabaseClient');
const { assertSupabase } = supabase;
const { periodFromQuery, iso, aggregate } = require('../services/transacoesMetrics');

exports.resumo = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);
  const { data, error } = await supabase
    .from('transacoes')
    .select('cpf,cliente_nome,plano,valor_bruto,valor_final')
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));
  if (error) return next(error);

  const metrics = aggregate(data, { from, to });

  return res.json({
    periodo: { from: iso(from), to: iso(to) },
    totalTransacoes: metrics.qtdTransacoes,
    totalBruto: metrics.bruto,
    totalDescontos: metrics.descontos,
    totalLiquido: metrics.liquido,
    porPlano: metrics.porPlano,
    porCliente: metrics.porCliente,
  });
};

exports.csv = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);
  const q = supabase
    .from('transacoes')
    .select(
      'id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final,origem'
    )
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));

  if (req.query.cpf) q.eq('cpf', req.query.cpf);
  if (req.query.plano) q.eq('plano', req.query.plano);

  const { data, error } = await q;
  if (error) return next(error);

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
  resumo: exports.resumo,
  csv: exports.csv,
};
