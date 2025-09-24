// Store responsável por coordenar o estado da conferência de lotes.
// Mantém uma estrutura simples com eventos (emit/on) e agregados por RZ/SKU.

const STORAGE_KEYS = {
  currentRZ: 'cv.conferencia.currentRZ',
};

const listeners = new Map();
const countSubscribers = new Set();

const state = {
  itens: [],
  itemsByRZ: {},
  totalByRZSku: {},
  metaByRZSku: {},
  conferidos: {},
  excedentes: {},
  itemIndex: new Map(),
  rzs: [],
  currentRZ: loadPersistedRZ(),
  rzAuto: null,
};

function loadPersistedRZ() {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(STORAGE_KEYS.currentRZ) || '';
  } catch (err) {
    console.warn('[store] não foi possível ler currentRZ do storage', err);
    return '';
  }
}

function persistCurrentRZ(value) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEYS.currentRZ, value);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.currentRZ);
    }
  } catch (err) {
    console.warn('[store] não foi possível persistir currentRZ', err);
  }
}

function emit(event, payload) {
  const subs = listeners.get(event);
  if (!subs) return;
  subs.forEach((callback) => {
    try {
      callback(payload);
    } catch (err) {
      console.error('[store] listener error for', event, err);
    }
  });
}

function on(event, callback) {
  if (typeof callback !== 'function') return () => {};
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const subs = listeners.get(event);
  subs.add(callback);
  return () => subs.delete(callback);
}

function safeString(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  return value.toString().trim();
}

function safeNumber(value) {
  if (value == null || value === '') return 0;
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  if (typeof value === 'string') {
    const normalized = value
      .replace(/[^0-9,.-]+/g, '')
      .replace(/\.(?=.*\.)/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function itemKey(rz, sku) {
  const rzKey = safeString(rz).toUpperCase() || '__SEM_RZ__';
  const skuKey = safeString(sku).toUpperCase() || '__SEM_SKU__';
  return `${rzKey}::${skuKey}`;
}

function sumObjectValues(obj) {
  if (!obj) return 0;
  if (obj instanceof Map) {
    let total = 0;
    obj.forEach((value) => {
      total += safeNumber(value);
    });
    return total;
  }
  if (Array.isArray(obj)) {
    return obj.reduce((acc, value) => acc + safeNumber(value), 0);
  }
  if (typeof obj === 'object') {
    return Object.values(obj).reduce((acc, value) => acc + safeNumber(value), 0);
  }
  return safeNumber(obj);
}

function notifyCounts() {
  if (!countSubscribers.size) return;
  const snapshot = selectCounts(state.currentRZ);
  countSubscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (err) {
      console.error('[store] count subscriber error', err);
    }
  });
}

function subscribeCounts(listener) {
  if (typeof listener !== 'function') return () => {};
  countSubscribers.add(listener);
  listener(selectCounts(state.currentRZ));
  return () => countSubscribers.delete(listener);
}

function selectCounts(rz) {
  const key = safeString(rz);
  return {
    meta: sumObjectValues(state.metaByRZSku[key]),
    conferidos: sumObjectValues(state.conferidos[key]),
    excedentes: sumObjectValues(state.excedentes[key]),
    valorTotal: sumObjectValues(state.totalByRZSku[key]),
  };
}

function setRZs(rzs = []) {
  const unique = [];
  const seen = new Set();
  rzs
    .map(safeString)
    .filter(Boolean)
    .forEach((rz) => {
      const key = rz.toUpperCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(rz);
    });

  state.rzs = unique;

  if (unique.length === 0) {
    if (state.currentRZ) {
      setCurrentRZ('', { silent: true });
    }
    emit('rz:list', []);
    return;
  }

  if (!unique.includes(state.currentRZ)) {
    setCurrentRZ(unique[0], { silent: true });
  }

  emit('rz:list', state.rzs.slice());
}

function setCurrentRZ(rz, { silent = false } = {}) {
  const value = safeString(rz);
  state.currentRZ = value;
  persistCurrentRZ(value);

  if (!silent) {
    emit('rz:change', state.currentRZ);
    notifyCounts();
  }
}

function setItens(itens = []) {
  const list = Array.isArray(itens) ? itens.map((item) => ({ ...item })) : [];
  state.itens = list;

  const itemsByRZ = {};
  const totalByRZSku = {};
  const metaByRZSku = {};
  const itemIndex = new Map();

  list.forEach((item) => {
    const rz = safeString(item.codigoRZ);
    const sku = safeString(item.sku);
    const quantidade = safeNumber(item.quantidade);
    const valorTotal = safeNumber(item.valorTotal);

    if (!itemsByRZ[rz]) itemsByRZ[rz] = [];
    itemsByRZ[rz].push({ ...item, quantidade, valorTotal });

    if (!totalByRZSku[rz]) totalByRZSku[rz] = {};
    if (!metaByRZSku[rz]) metaByRZSku[rz] = {};

    totalByRZSku[rz][sku] = (totalByRZSku[rz][sku] || 0) + valorTotal;
    metaByRZSku[rz][sku] = (metaByRZSku[rz][sku] || 0) + quantidade;

    itemIndex.set(itemKey(rz, sku), { ...item, quantidade, valorTotal });
  });

  state.itemsByRZ = itemsByRZ;
  state.totalByRZSku = totalByRZSku;
  state.metaByRZSku = metaByRZSku;
  state.conferidos = {};
  state.excedentes = {};
  state.itemIndex = itemIndex;

  try {
    const grupos = Object.keys(itemsByRZ).length;
    console.log('[STORE] setItens', { totalItens: list.length, gruposRZ: grupos });
  } catch (err) {
    console.debug('[STORE] setItens log failure', err);
  }

  notifyCounts();
  emit('itens:update', { itens: state.itens });
}

function bulkUpsertItems(itens = []) {
  if (!Array.isArray(itens)) return;
  itens.forEach((item) => {
    if (!item) return;
    const rz = safeString(item.codigoRZ);
    const sku = safeString(item.sku);
    state.itemIndex.set(itemKey(rz, sku), { ...item });
  });
}

export { state, emit, on, setRZs, setCurrentRZ, setItens, bulkUpsertItems, subscribeCounts, selectCounts };

const storeApi = {
  state,
  emit,
  on,
  setRZs,
  setCurrentRZ,
  setItens,
  bulkUpsertItems,
  subscribeCounts,
  selectCounts,
};

if (typeof window !== 'undefined') {
  try {
    if (!window.store) {
      window.store = storeApi;
    }
    if (!window.__STORE_DEBUG_LISTENERS__) {
      window.__STORE_DEBUG_LISTENERS__ = true;
      on('refresh', () => {
        console.debug('[STORE][DBG] refresh event broadcasted to listeners');
      });
      on('rz:auto', (rz) => {
        console.debug('[STORE][DBG] rz:auto payload from store', rz);
      });
    }
  } catch (err) {
    console.warn('[STORE] falha ao registrar debug listeners', err);
  }
}

export default storeApi;
