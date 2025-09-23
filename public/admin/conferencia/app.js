// Camada de UI da conferência de lotes.
// [Ajuste] O app agora escuta o evento 'rz:auto' para aplicar o valor gerado
//          automaticamente no <select>, exibe o alerta visual e aplica o RZ
//          salvo no store durante a inicialização.

import store, { on } from './store/index.js';
import { processarPlanilha } from './excel.js';

let rzSelect;
let rzAlert;
let fileInput;

let initialized = false;

function ensureAutoOption(rz) {
  if (!rzSelect) return;

  const currentAuto = rzSelect.querySelector('option[data-auto-rz="1"]');
  if (currentAuto && currentAuto.value !== rz) {
    const duplicates = Array.from(rzSelect.options).filter(
      (opt) => opt !== currentAuto && opt.value === currentAuto.value,
    );
    if (duplicates.length === 0) {
      currentAuto.remove();
    } else {
      currentAuto.dataset.autoRz = '';
    }
  }

  let option = Array.from(rzSelect.options).find((opt) => opt.value === rz);
  if (!option) {
    option = document.createElement('option');
    option.value = rz;
    option.textContent = rz;
    option.dataset.autoRz = '1';
    rzSelect.appendChild(option);
  } else {
    option.dataset.autoRz = '1';
  }

  if (rzSelect.value !== rz) {
    option.selected = true;
    rzSelect.value = rz;
    rzSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

function removeAutoOption() {
  if (!rzSelect) return;
  const autoOption = rzSelect.querySelector('option[data-auto-rz="1"]');
  if (!autoOption) return;

  const duplicates = Array.from(rzSelect.options).filter(
    (opt) => opt !== autoOption && opt.value === autoOption.value,
  );

  const wasSelected = autoOption.selected;

  if (duplicates.length === 0) {
    autoOption.remove();
    if (wasSelected) {
      const fallback = rzSelect.options[0];
      if (fallback) {
        rzSelect.value = fallback.value;
        rzSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  } else {
    delete autoOption.dataset.autoRz;
  }
}

export function applyAutoRzSelection(rz) {
  if (!rz) return;
  ensureAutoOption(rz);
  renderAutoRzAlert(rz);
}

function renderAutoRzAlert(rz) {
  if (!rzAlert) return;
  if (rz) {
    rzAlert.classList.add('alert', 'alert--warn', 'is-visible');
    rzAlert.removeAttribute('hidden');
    rzAlert.textContent = '⚠️ Nenhuma coluna RZ encontrada, usando ';
    const strong = document.createElement('strong');
    strong.textContent = rz;
    rzAlert.appendChild(strong);
  } else {
    rzAlert.classList.remove('is-visible');
    rzAlert.setAttribute('hidden', 'hidden');
    rzAlert.textContent = '';
  }
}

async function handleFileChange(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  try {
    await processarPlanilha(file);
    if (store.state.rzAuto) {
      applyAutoRzSelection(store.state.rzAuto);
    } else {
      renderAutoRzAlert('');
      removeAutoOption();
    }
  } catch (err) {
    console.error('[app] falha ao processar planilha', err);
    renderAutoRzAlert('');
  }
}

function registerEvents() {
  if (fileInput) {
    fileInput.addEventListener('change', handleFileChange);
  }

  // [Ajuste] Listener responsável por aplicar imediatamente o RZ automático.
  on('rz:auto', (rz) => {
    if (!rz) return;
    applyAutoRzSelection(rz);
  });

  on('planilha:update', ({ rzAuto } = {}) => {
    if (rzAuto) {
      renderAutoRzAlert(rzAuto);
    } else {
      renderAutoRzAlert('');
      removeAutoOption();
    }
  });
}

export function initApp() {
  if (initialized) return;
  initialized = true;

  rzSelect = document.querySelector('#select-rz');
  rzAlert = document.querySelector('[data-auto-rz-alert]');
  fileInput = document.querySelector('[data-planilha-input]');

  registerEvents();

  if (store.state.rzAuto) {
    applyAutoRzSelection(store.state.rzAuto);
  } else {
    renderAutoRzAlert('');
    removeAutoOption();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
