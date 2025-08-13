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

function aggregate(transacoes = [], { from, to } = {}) {
  let bruto = 0;
  let descontos = 0;
  let liquido = 0;
  const planos = {};
  const dias = {};
  const clientes = {};

  (transacoes || []).forEach((tx) => {
    const b = Number(tx.valor_bruto) || 0;
    const l = Number(tx.valor_final) || 0;
    const d = Number(tx.desconto_aplicado) || b - l;

    bruto += b;
    descontos += d;
    liquido += l;

    if (tx.plano) {
      if (!planos[tx.plano])
        planos[tx.plano] = { plano: tx.plano, qtd: 0, bruto: 0, descontos: 0, liquido: 0 };
      const p = planos[tx.plano];
      p.qtd++;
      p.bruto += b;
      p.descontos += d;
      p.liquido += l;
    }

    if (tx.created_at) {
      const day = tx.created_at.slice(0, 10);
      if (!dias[day]) dias[day] = { date: day, qtd: 0, liquido: 0 };
      dias[day].qtd++;
      dias[day].liquido += l;
    }

    if (tx.cpf) {
      if (!clientes[tx.cpf])
        clientes[tx.cpf] = { cpf: tx.cpf, nome: tx.cliente_nome, qtd: 0, bruto: 0, descontos: 0, liquido: 0 };
      const c = clientes[tx.cpf];
      c.qtd++;
      c.bruto += b;
      c.descontos += d;
      c.liquido += l;
    }
  });

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

  const porDia = [];
  if (from && to) {
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const date = d.toISOString().slice(0, 10);
      const obj = dias[date] || { date, qtd: 0, liquido: 0 };
      porDia.push({ date: obj.date, qtd: obj.qtd, liquido: round(obj.liquido) });
    }
  } else {
    Object.values(dias)
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((obj) =>
        porDia.push({ date: obj.date, qtd: obj.qtd, liquido: round(obj.liquido) })
      );
  }

  return {
    qtdTransacoes: (transacoes || []).length,
    bruto: round(bruto),
    descontos: round(descontos),
    liquido: round(liquido),
    porPlano,
    porDia,
    porCliente,
  };
}

module.exports = { DAY, parseISO, periodFromQuery, iso, round, aggregate };

