// src/utils/currency.js
const toCents = (v) => Math.round(Number(v) * 100);
const fromCents = (v) => Number((Number(v ?? 0) / 100).toFixed(2));
module.exports = { toCents, fromCents };
