// Store simples para coordenar o estado da conferência de lotes.
// [Ajuste] Este arquivo foi revisado para expor setCurrentRZ com suporte
//          ao valor automático e para adicionar a função on(event, cb).

const state = {
  itens: [],
  rzs: [],
  currentRZ: '',
  rzAuto: '',
};

const listeners = new Map();

function emit(event, payload) {
  const subs = listeners.get(event);
  if (!subs) return;
  subs.forEach((cb) => {
    try {
      cb(payload);
    } catch (err) {
      // Mantemos o erro visível para diagnóstico sem interromper os demais listeners.
      console.error('[store] listener error for', event, err);
    }
  });
}

function on(event, callback) {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const subs = listeners.get(event);
  subs.add(callback);
  return () => subs.delete(callback);
}

function setPlanilhaData({ itens = [], rzs = [], rzAuto = '' } = {}) {
  state.itens = Array.isArray(itens) ? [...itens] : [];
  state.rzs = Array.isArray(rzs) ? [...rzs] : [];
  // [Ajuste] Sempre sincronizamos o valor automático armazenado no estado.
  state.rzAuto = typeof rzAuto === 'string' ? rzAuto.trim() : (rzAuto ?? '').toString().trim();

  // Ajusta o currentRZ apenas se ele não estiver presente na lista atual.
  if (!state.rzs.includes(state.currentRZ) && !state.rzAuto) {
    state.currentRZ = state.rzs[0] || '';
  }

  emit('planilha:update', { itens: state.itens, rzs: state.rzs, rzAuto: state.rzAuto });
}

function setCurrentRZ(rz, { auto = false } = {}) {
  const value = typeof rz === 'string' ? rz.trim() : (rz ?? '').toString().trim();
  state.currentRZ = value;

  if (auto) {
    // [Ajuste] Quando o valor é automático, mantemos cópia em state.rzAuto.
    state.rzAuto = value;
  } else if (state.rzAuto && value !== state.rzAuto) {
    // Limpa o auto-RZ caso o usuário selecione manualmente outro valor.
    state.rzAuto = '';
  }

  emit('rz:change', state.currentRZ);
}

export { state, emit, on, setPlanilhaData, setCurrentRZ };

export default {
  state,
  emit,
  on,
  setPlanilhaData,
  setCurrentRZ,
};
