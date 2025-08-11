const fs = require('fs');
const path = require('path');
require('dotenv').config();

function ensureHttps(u){
  if(!u) return '';
  if(!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/,'');
}

const vercelPath = path.join(__dirname, '..', 'vercel.json');
const json = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
const api = ensureHttps(process.env.RAILWAY_URL || process.env.API_BASE);

if(!api || !/^https:\/\//i.test(api)){
  console.error('✖ RAILWAY_URL inválida. Defina RAILWAY_URL (ex.: https://meuapp.up.railway.app)');
  process.exit(1);
}

const s = JSON.stringify(json).replace(/__API_BASE__/g, api);
fs.writeFileSync(vercelPath, s);
console.log('✓ vercel.json patch: ', api);
