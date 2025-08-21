const path = require('path');

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
