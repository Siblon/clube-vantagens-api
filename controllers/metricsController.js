const { supabase, assertSupabase } = require('../supabaseClient');
const { periodFromQuery, iso, aggregate } = require('../services/transacoesMetrics');

exports.resume = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);
  const { data: clientes, error: cliErr } = await supabase
    .from('clientes')
    .select('status');
  if (cliErr) return next(cliErr);
  let ativos = 0;
  let inativos = 0;
  (clientes || []).forEach((c) => {
    if (c.status === 'ativo') ativos += 1;
    else inativos += 1;
  });

  const { data: txs, error: txErr } = await supabase
    .from('transacoes')
    .select(
      'id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final'
    )
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));
  if (txErr) return next(txErr);

  const metrics = aggregate(txs, { from, to });
  const topClientes = metrics.porCliente
    .sort((a, b) => b.liquido - a.liquido)
    .slice(0, 5);

  return res.json({
    periodo: { from: iso(from), to: iso(to) },
    clientes: { ativos, inativos, total: ativos + inativos },
    totais: {
      qtdTransacoes: metrics.qtdTransacoes,
      bruto: metrics.bruto,
      descontos: metrics.descontos,
      liquido: metrics.liquido,
    },
    porPlano: metrics.porPlano,
    porDia: metrics.porDia,
    topClientes,
  });
};

exports.csv = async (req, res, next) => {
  if (!assertSupabase(res)) return;
  const { from, to } = periodFromQuery(req.query);
  const { data, error } = await supabase
    .from('transacoes')
    .select('id,created_at,cpf,cliente_nome,plano,valor_bruto,desconto_aplicado,valor_final')
    .gte('created_at', iso(from))
    .lte('created_at', iso(to));
  if (error) return next(error);

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
