const path = require('path');

const _log = console.log;
console.log = (...args) => {
  const m = (args[0] || '').toString();
  if (m.includes('[dotenv@')) return; // silencia dicas do dotenv
  _log(...args);
};

try { jest.mock('config/supabase'); } catch (_e) {}
try {
  const abs = path.join(process.cwd(), 'config', 'supabase.js');
  const mockPath = path.join(__dirname, '__mocks__', 'config', 'supabase.js');
  jest.mock(abs, () => require(mockPath));
} catch (_e) {}

let supabaseMock;
try {
  supabaseMock = require(path.join(__dirname, '__mocks__', 'config', 'supabase.js'));
} catch (_) {}
if (supabaseMock && supabaseMock.__reset) {
  beforeEach(() => supabaseMock.__reset());
}
