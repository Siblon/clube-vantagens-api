const _log = console.log;
console.log = (...args) => {
  const m = (args[0] || '').toString();
  if (m.includes('[dotenv@')) return; // silencia dicas do dotenv
  _log(...args);
};

