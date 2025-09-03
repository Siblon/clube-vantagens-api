// scripts/maybe-migrate.cjs
/* Rodar migrations de forma tolerante no boot */
const { execSync } = require('child_process');

function log(msg){ console.log('[maybe-migrate]', msg); }

try {
  if (process.env.DISABLE_RUNTIME_MIGRATIONS === 'true') {
    return log('skipping (DISABLE_RUNTIME_MIGRATIONS=true)');
  }
  if (!process.env.DATABASE_URL) {
    return log('skipping (DATABASE_URL not set)');
  }
  // Usa npx em produção; tolera "no migrations to apply"
  log('running: npx --yes dbmate up');
  execSync('npx --yes dbmate up', { stdio: 'inherit' });
  log('done');
} catch (e) {
  console.error('[maybe-migrate] error:', e.message || e);
  // Não derruba o processo: continuamos sem migrar
}
