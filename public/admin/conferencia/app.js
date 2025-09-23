// Camada de UI da conferência de lotes.
// Responsável por coordenar a importação da planilha e refletir o RZ na interface.

import store, { emit, on, setCurrentRZ } from './store/index.js';

let fileInput;
let rzSelect;
let autoRzAlert;
let importCard;
let initialized = false;

function ensureAlertElement() {
  if (!importCard) return null;
  if (autoRzAlert && importCard.contains(autoRzAlert)) return autoRzAlert;

  autoRzAlert = importCard.querySelector('[data-auto-rz-alert]');
  if (!autoRzAlert) {
    autoRzAlert = document.createElement('div');
    autoRzAlert.dataset.autoRzAlert = 'true';
    autoRzAlert.classList.add('alert', 'alert--warn');
    autoRzAlert.setAttribute('role', 'alert');
    autoRzAlert.setAttribute('hidden', 'hidden');
    autoRzAlert.classList.add('is-hidden');
    importCard?.prepend(autoRzAlert);
  }

  return autoRzAlert;
}

function renderAutoRzAlert(rz) {
  const element = ensureAlertElement();
  if (!element) return;

  if (rz) {
    element.innerHTML = '';
    const message = document.createElement('span');
    message.textContent = 'Nenhuma coluna RZ encontrada. Usando ';
    const strong = document.createElement('strong');
    strong.textContent = rz;
    element.append('⚠️ ', message, strong);
    element.classList.remove('is-hidden');
    element.removeAttribute('hidden');
  } else {
    element.classList.add('is-hidden');
    element.setAttribute('hidden', 'hidden');
    element.textContent = '';
  }
}

function ensureAutoOption(rz) {
  if (!rzSelect) return null;
  const value = typeof rz === 'string' ? rz : '';
  let option = Array.from(rzSelect.options).find((opt) => opt.value === value);
  if (!option) {
    option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    option.dataset.autoRz = '1';
    rzSelect.appendChild(option);
  } else {
    option.dataset.autoRz = '1';
  }
  if (rzSelect.value !== value) {
    rzSelect.value = value;
    rzSelect.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return option;
}

function removeAutoOption() {
  if (!rzSelect) return;
  const autoOption = Array.from(rzSelect.options).find((opt) => opt.dataset.autoRz === '1');
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
  if (!rz) {
    removeAutoOption();
    renderAutoRzAlert('');
    return;
  }

  ensureAutoOption(rz);
  renderAutoRzAlert(rz);
  console.info('[RZ] aplicado no select:', rz);
}

function clearAutoRzUI() {
  removeAutoOption();
  renderAutoRzAlert('');
}

function handleSelectChange(event) {
  const value = event?.target?.value ?? '';
  setCurrentRZ(value);
  emit('refresh');
}

async function handleFileChange(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;

  console.info('[IMPORT] arquivo selecionado:', file.name);

  try {
    const module = await import('./excel.js');
    const result = await module.processarPlanilha(file, store.state.currentRZ);
    if (result?.rzAuto) {
      applyAutoRzSelection(result.rzAuto);
    } else {
      clearAutoRzUI();
    }
  } catch (err) {
    console.error('[IMPORT] falha ao processar planilha', err);
    clearAutoRzUI();
  } finally {
    if (event?.target) {
      event.target.value = '';
    }
  }
}

function setupSelectListener() {
  if (!rzSelect) return;
  rzSelect.addEventListener('change', handleSelectChange);
}

function setupFileImport() {
  if (!fileInput) return;
  fileInput.addEventListener('change', handleFileChange);
}

function setupAutoRzListener() {
  on('rz:auto', (rz) => {
    if (rz) {
      applyAutoRzSelection(rz);
    } else {
      clearAutoRzUI();
    }
  });
}

function initDomRefs() {
  fileInput = document.querySelector('#file');
  rzSelect = document.querySelector('#select-rz');
  importCard = document.querySelector('#card-importacao');
  autoRzAlert = importCard?.querySelector('[data-auto-rz-alert]') || autoRzAlert || null;
  ensureAlertElement();
}

export function initApp() {
  if (initialized) return;
  initialized = true;

  initDomRefs();
  setupAutoRzListener();
  setupSelectListener();
  setupFileImport();

  if (store.state.rzAuto) {
    applyAutoRzSelection(store.state.rzAuto);
  } else {
    clearAutoRzUI();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
