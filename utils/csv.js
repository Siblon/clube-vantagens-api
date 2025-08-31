const BOM = '\uFEFF'; // UTF-8 BOM para Excel
const SEP = ';';      // Delimitador amigável pt-BR

function needsQuote(s) {
  return /[;\n\r"]/u.test(s);
}

function esc(s) {
  // duplica aspas quando necessário
  return `"${String(s).replace(/"/g, '""')}"`;
}

// Evita o Excel comer zeros à esquerda: usa fórmula ="0123..."
function keepAsText(s) {
  if (s === null || s === undefined) return '';
  const str = String(s);
  if (str === '') return '';
  return `="${str}"`;
}

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  // dd/MM/yyyy HH:mm
  const pad = (n) => String(n).padStart(2, '0');
  const dia = pad(d.getDate());
  const mes = pad(d.getMonth() + 1);
  const ano = d.getFullYear();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${dia}/${mes}/${ano} ${hh}:${mm}`;
}

function cell(val, { forceText = false } = {}) {
  if (val === null || val === undefined) return '';
  let s = String(val);

  if (forceText) {
    return keepAsText(s);
  }

  // só aspas quando necessário
  return needsQuote(s) ? esc(s) : s;
}

function toCSV({ headers, rows }) {
  const head = headers.join(SEP);
  const body = rows.map((r) => r.join(SEP)).join('\r\n');
  return BOM + head + '\r\n' + body + '\r\n';
}

module.exports = {
  SEP, BOM, cell, toCSV, keepAsText, formatDate,
};
