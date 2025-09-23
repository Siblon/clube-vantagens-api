// Rotinas relacionadas ao parsing da planilha de lotes.
// [Ajuste] parsePlanilha agora garante o retorno de { itens, rzs, rzAuto }
//          e gera um RZ automático quando a coluna não existir. Além disso,
//          processarPlanilha dispara o evento 'rz:auto' quando aplicamos o valor gerado.

import store, { emit, setCurrentRZ, setPlanilhaData } from './store/index.js';

const RZ_KEY = 'rz';

const normalizeKey = (key = '') =>
  key
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const sanitizeCell = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return value;
};

const normalizeRow = (row = {}) => {
  const out = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeKey(key);
    if (!normalizedKey) return;
    out[normalizedKey] = sanitizeCell(value);
  });
  return out;
};

const isRowEmpty = (row = {}) =>
  Object.keys(row).length === 0 || Object.values(row).every((value) => {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    return false;
  });

const getRzValue = (row = {}) => {
  const raw = row[RZ_KEY];
  if (raw == null) return '';
  if (typeof raw === 'string') return raw.trim();
  return raw.toString().trim();
};

const buildAutoRz = (fileName = '') => {
  const baseName = fileName
    .toString()
    .replace(/\.[^/.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-');

  const clean = baseName.replace(/^-+|-+$/g, '').toUpperCase();
  return `RZ-${clean || 'AUTO'}`;
};

const getFileName = (input, explicitName = '') => {
  if (explicitName) return explicitName;
  if (typeof input === 'object' && input && 'name' in input) return input.name;
  return '';
};

async function loadRows(input, options = {}) {
  if (Array.isArray(options.rows)) return options.rows;
  if (Array.isArray(input)) return input;
  if (!input) return [];

  const xlsxLib =
    options.xlsx ||
    (typeof window !== 'undefined' ? window.XLSX : undefined);

  if (!xlsxLib) {
    throw new Error('Biblioteca XLSX não disponível para leitura da planilha.');
  }

  const arrayBuffer =
    input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  const workbook =
    options.workbook || xlsxLib.read(arrayBuffer, { type: 'array' });
  const sheetName = options.sheetName || workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
}

export async function parsePlanilha(input, options = {}) {
  const rows = await loadRows(input, options);
  const nomeArquivo = getFileName(input, options.fileName);

  const itens = rows
    .map(normalizeRow)
    .filter((row) => !isRowEmpty(row));

  const possuiColunaRz = itens.some((row) => Object.prototype.hasOwnProperty.call(row, RZ_KEY));
  const possuiValorRz = possuiColunaRz && itens.some((row) => getRzValue(row));

  let rzAuto = '';
  const rzs = new Set();

  if (!possuiColunaRz || !possuiValorRz) {
    rzAuto = buildAutoRz(nomeArquivo);
    itens.forEach((row) => {
      row[RZ_KEY] = rzAuto;
    });
    rzs.add(rzAuto);
  } else {
    itens.forEach((row) => {
      const valor = getRzValue(row);
      row[RZ_KEY] = valor;
      if (valor) rzs.add(valor);
    });
  }

  return {
    itens,
    rzs: Array.from(rzs),
    rzAuto,
  };
}

export async function processarPlanilha(input, options = {}) {
  const { itens, rzs, rzAuto } = await parsePlanilha(input, options);

  setPlanilhaData({ itens, rzs, rzAuto });

  const previous = store.state.currentRZ;

  if (rzAuto) {
    setCurrentRZ(rzAuto, { auto: true });
    emit('rz:auto', rzAuto);
  } else {
    const proximo = previous && rzs.includes(previous) ? previous : (rzs[0] || '');
    setCurrentRZ(proximo, { auto: false });
    // Limpa qualquer resquício de auto caso exista, mantendo listeners atualizados.
    if (store.state.rzAuto) {
      store.state.rzAuto = '';
      emit('planilha:update', {
        itens: store.state.itens,
        rzs: store.state.rzs,
        rzAuto: store.state.rzAuto,
      });
    }
  }

  return { itens, rzs, rzAuto };
}
