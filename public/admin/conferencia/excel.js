// Rotinas relacionadas ao parsing da planilha de lotes.
// Responsável por detectar cabeçalhos em diferentes formatos e popular o store.

import store, { emit, setCurrentRZ, setItens, setRZs, bulkUpsertItems } from './store/index.js';

const HEADER_ALIASES = {
  codigoRZ: [
    'rz',
    'cod_rz',
    'codigo_rz',
    'codigo_da_rz',
    'rz_lote',
    'cod_rz_lote',
    'lote',
    'regiao',
    'regional',
    'deposito',
    'centro',
    'centro_distribuicao',
    'cd',
    'cod_cd',
    'codigo_deposito',
  ],
  sku: [
    'sku',
    'sku_id',
    'ml',
    'mlb',
    'mlb_id',
    'codigo',
    'codigo_sku',
    'cod_sku',
    'cod_produto',
    'codigo_produto',
    'id_produto',
    'produto_id',
    'item',
    'id_item',
    'codigo_item',
    'cod_item',
    'referencia',
    'ref',
    'ean',
    'gtin',
    'codigo_mlb',
  ],
  descricao: [
    'descricao',
    'descricao_produto',
    'produto',
    'nome',
    'nome_produto',
    'titulo',
    'desc_produto',
    'descricao_item',
    'item_descricao',
  ],
  quantidade: [
    'quantidade',
    'qtd',
    'qtde',
    'qt',
    'qte',
    'quant',
    'quantidade_total',
    'quant_total',
    'quantidade_prevista',
    'quantidade_planejada',
    'quantidade_meta',
    'meta',
    'qtde_prevista',
    'qtd_prevista',
    'quantidade_prev',
  ],
  valorUnitario: [
    'valor_unitario',
    'valor_unit',
    'vl_unit',
    'valor_un',
    'preco_unitario',
    'preco_unit',
    'preco_medio',
    'preco_medio_unitario',
    'custo_medio',
    'preco_medio_rz',
  ],
  valorTotal: [
    'valor_total',
    'vl_total',
    'valor',
    'total',
    'preco_total',
    'valor_previsto',
    'valor_bruto',
    'valor_liquido',
    'faturamento_total',
    'valor_total_previsto',
  ],
};

const normalizeKey = (key = '') =>
  key
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

function sanitizeText(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return value.toString();
  return `${value}`.trim();
}

function parseNumber(value) {
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return value;
    return 0;
  }
  if (typeof value !== 'string') return 0;

  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/[^0-9.,-]+/g, '')
    .replace(/\.(?=.*\.)/g, '')
    .replace(',', '.');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCurrency(value) {
  const num = parseNumber(value);
  return Math.round(num * 100) / 100;
}

function getFileName(input, explicit) {
  if (explicit) return explicit;
  if (input && typeof input === 'object') {
    if (typeof input.name === 'string') return input.name;
    if ('filename' in input && typeof input.filename === 'string') return input.filename;
  }
  return '';
}

function deriveAutoRZ(input, { fileName } = {}) {
  const name = getFileName(input, fileName);
  const base = name.replace(/\.[^.]+$/, '');
  const digits = (base.match(/\d+/g) || []).join('');
  if (digits) return `RZ-${digits}`;
  const sanitized = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  return `RZ-${sanitized || 'AUTO'}`;
}

async function loadRows(input, options = {}) {
  if (Array.isArray(options.rows)) return options.rows;
  if (Array.isArray(input)) return input;
  if (!input) return [];

  const xlsxLib = options.xlsx || (typeof window !== 'undefined' ? window.XLSX : undefined);
  if (!xlsxLib) {
    throw new Error('Biblioteca XLSX não disponível para leitura da planilha.');
  }

  const arrayBuffer =
    input instanceof ArrayBuffer ? input : await input.arrayBuffer();
  const workbook = options.workbook || xlsxLib.read(arrayBuffer, { type: 'array' });
  const sheetName = options.sheetName || workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return xlsxLib.utils.sheet_to_json(sheet, { defval: '' });
}

function resolveColumnMap(rows) {
  const seen = new Map();

  rows.forEach((row) => {
    Object.keys(row || {}).forEach((rawKey) => {
      const normalized = normalizeKey(rawKey);
      if (!normalized) return;
      if (!seen.has(normalized)) {
        seen.set(normalized, rawKey);
      }
    });
  });

  const map = {};
  const tryResolve = (field, candidates) => {
    for (const alias of candidates) {
      if (seen.has(alias)) {
        map[field] = seen.get(alias);
        return true;
      }
    }
    return false;
  };

  Object.entries(HEADER_ALIASES).forEach(([field, aliases]) => {
    tryResolve(field, aliases);
  });

  const heuristics = Array.from(seen.entries());

  if (!map.codigoRZ) {
    const fallback = heuristics.find(([key]) => key.includes('rz') || key.includes('regiao') || key.includes('lote'));
    if (fallback) map.codigoRZ = fallback[1];
  }

  if (!map.sku) {
    const fallback = heuristics.find(([key]) =>
      key.includes('sku') || key.includes('ml') || key.includes('produto') || key.includes('codigo'),
    );
    if (fallback) map.sku = fallback[1];
  }

  if (!map.descricao) {
    const fallback = heuristics.find(([key]) => key.includes('desc') || key.includes('nome') || key.includes('produto'));
    if (fallback) map.descricao = fallback[1];
  }

  if (!map.quantidade) {
    const fallback = heuristics.find(([key]) => key.includes('quant') || key.includes('qt'));
    if (fallback) map.quantidade = fallback[1];
  }

  if (!map.valorUnitario) {
    const fallback = heuristics.find(([key]) => key.includes('unit') || key.includes('medio') || key.includes('preco'));
    if (fallback) map.valorUnitario = fallback[1];
  }

  if (!map.valorTotal) {
    const fallback = heuristics.find(([key]) => key.includes('total') || (key.startsWith('valor') && key !== map.valorUnitario));
    if (fallback) map.valorTotal = fallback[1];
  }

  return map;
}

function mapRowToItem(row, columnMap) {
  if (!row || typeof row !== 'object') return null;

  const codigoRZ = columnMap.codigoRZ ? sanitizeText(row[columnMap.codigoRZ]) : '';
  const sku = columnMap.sku ? sanitizeText(row[columnMap.sku]) : '';
  const descricao = columnMap.descricao ? sanitizeText(row[columnMap.descricao]) : '';

  const quantidade = toCurrency(row[columnMap.quantidade]);
  const valorUnitario = toCurrency(row[columnMap.valorUnitario]);
  let valorTotal = toCurrency(row[columnMap.valorTotal]);

  if (!valorTotal && quantidade && valorUnitario) {
    valorTotal = Math.round(quantidade * valorUnitario * 100) / 100;
  }

  const hasData = Boolean(codigoRZ || sku || descricao || quantidade || valorUnitario || valorTotal);
  if (!hasData) return null;

  return {
    codigoRZ,
    sku,
    descricao,
    quantidade,
    valorUnitario,
    valorTotal,
  };
}

function cloneItemsByRZ(groups = {}) {
  const out = {};
  Object.entries(groups).forEach(([rz, list]) => {
    out[rz] = Array.isArray(list) ? list.map((item) => ({ ...item })) : [];
  });
  return out;
}

function cloneNested(obj = {}) {
  const out = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = { ...value };
    } else {
      out[key] = value;
    }
  });
  return out;
}

export async function parsePlanilha(input, options = {}) {
  const rows = await loadRows(input, options);
  if (!rows.length) {
    return { rzs: [], itens: [], rzAuto: null };
  }

  const columnMap = resolveColumnMap(rows);
  const itens = rows
    .map((row) => mapRowToItem(row, columnMap))
    .filter(Boolean);

  const seenRZ = new Set();
  const rzs = [];

  itens.forEach((item) => {
    if (!item.codigoRZ) return;
    const value = item.codigoRZ;
    if (seenRZ.has(value)) return;
    seenRZ.add(value);
    rzs.push(value);
  });

  let rzAuto = null;
  const hasRzValues = rzs.length > 0;

  if (!hasRzValues) {
    rzAuto = deriveAutoRZ(input, options);
    itens.forEach((item) => {
      item.codigoRZ = rzAuto;
    });
    rzs.push(rzAuto);
  }

  return { rzs, itens, rzAuto };
}

export async function processarPlanilha(input, currentRZ) {
  const fileName = getFileName(input);

  try {
    const { rzs, itens, rzAuto } = await parsePlanilha(input, { fileName });

    setRZs(rzs);

    const normalizedCurrent = sanitizeText(currentRZ);
    const candidates = [
      normalizedCurrent,
      sanitizeText(store.state.currentRZ),
      sanitizeText(rzAuto),
      sanitizeText(rzs[0]),
    ].filter((value, index, arr) => value && arr.indexOf(value) === index && rzs.includes(value));

    const resolvedRZ = candidates[0] || '';
    setCurrentRZ(resolvedRZ);

    store.state.rzAuto = rzAuto || null;
    setItens(itens);
    bulkUpsertItems(itens);

    const autoPayload = rzAuto || null;
    console.info('[IMPORT] parse result:', { rzs, count: itens.length, rzAuto: autoPayload });
    console.log('[EXCEL] processarPlanilha rzAuto', autoPayload);

    emit('refresh');
    emit('rz:auto', autoPayload);

    return {
      rzList: rzs,
      itemsByRZ: cloneItemsByRZ(store.state.itemsByRZ),
      totalByRZSku: cloneNested(store.state.totalByRZSku),
      metaByRZSku: cloneNested(store.state.metaByRZSku),
      rzAuto: autoPayload,
      itens: itens.map((item) => ({ ...item })),
    };
  } catch (error) {
    console.error('[EXCEL] falha ao processar planilha', error);
    emit('rz:auto', null);

    return {
      error: error?.message || 'Falha ao processar planilha',
      detalhes: error,
      rzList: [],
      itemsByRZ: {},
      totalByRZSku: {},
      metaByRZSku: {},
      rzAuto: null,
      itens: [],
    };
  }
}
