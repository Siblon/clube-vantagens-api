try { jest.mock('config/supabase'); } catch (_e) {}
try {
  const path = require('path');
  const abs = path.join(process.cwd(), 'config', 'supabase.js');
  jest.mock(abs, () => require('__mocks__/config/supabase.js'));
} catch (_e) {}

const supabaseMock = require('__mocks__/config/supabase.js');
beforeEach(() => supabaseMock.__reset && supabaseMock.__reset());

