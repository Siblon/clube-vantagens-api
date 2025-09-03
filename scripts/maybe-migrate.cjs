const { execSync } = require('node:child_process');

function maybeMigrate() {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[migrate] skip (NODE_ENV=${process.env.NODE_ENV})`);
    return;
  }
  console.log('[migrate] running dbmate up...');
  try {
    execSync('npx dbmate up', { stdio: 'inherit' });
    console.log('[migrate] done');
  } catch (e) {
    const msg = e?.stderr ? e.stderr.toString() : e?.message || '';
    if (msg.toLowerCase().includes('no migrations to apply')) {
      console.log('[migrate] no migrations to apply');
    } else {
      console.error('[migrate] failed', msg);
      throw e;
    }
  }
}

if (require.main === module) {
  try {
    maybeMigrate();
  } catch (e) {
    process.exit(1);
  }
}

module.exports = maybeMigrate;
