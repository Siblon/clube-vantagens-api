// Mock alias if present in Jest
try { jest.mock('config/supabase'); } catch (_e) {}

// Mock fallback (caminho absoluto do arquivo real)
try {
  const path = require('path');
  const abs = path.join(process.cwd(), 'config', 'supabase.js');
  jest.mock(abs, () => require('__mocks__/config/supabase.js'));
} catch (_e) {}

