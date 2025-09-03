// scripts/maybe-migrate.cjs
// Executa migrations de forma tolerante no boot (produção).
const { execSync } = require('child_process');

function log(msg){ console.log('[maybe-migrate]', msg); }

try {
  if (process.env.DISABLE_RUNTIME_MIGRATIONS === 'true') {
    return log('skipping (DISABLE_RUNTIME_MIGRATIONS=true)');
  }
  if (!process.env.DATABASE_URL) {
    return log('skipping (DATABASE_URL not set)');
  }
  log('running: npx --yes dbmate up');
  execSync('npx --yes dbmate up', { stdio: 'inherit' });
  log('done');
} catch (e) {
  console.error('[maybe-migrate] error:', e && e.message ? e.message : e);
  // Não derruba o processo: continuar sem migrar.
}
