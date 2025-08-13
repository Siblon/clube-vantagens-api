const { execSync } = require('node:child_process');

const isCI = !!process.env.CI || !!process.env.NETLIFY;
const hasDB = !!process.env.DATABASE_URL;

if (isCI || !hasDB) {
  console.log(`[migrate] pulando migração. CI=${isCI} DATABASE_URL=${hasDB ? 'definida' : 'ausente'}`);
  process.exit(0);
}

try {
  console.log('[migrate] rodando dbmate up…');
  execSync('npm run migrate', { stdio: 'inherit' });
} catch (e) {
  console.error('[migrate] falhou:', e?.message || e);
  process.exit(1);
}
