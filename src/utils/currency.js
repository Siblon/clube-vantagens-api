function parseBRL(input) {
  const s = String(input ?? '').trim();
  if (!s) return 0;
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  if (Number.isNaN(n)) throw new Error('Valor inválido');
  return n;
}

const toCents = (v) => Math.round(parseBRL(v) * 100);

module.exports = { parseBRL, toCents };
