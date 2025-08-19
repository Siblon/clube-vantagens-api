const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: process.env.DOTENV_CONFIG_PATH || process.env.dotenv_config_path || '.env',
});

const vercelPath = path.join(__dirname, '..', 'public', 'vercel.json');
const url = (process.env.RAILWAY_URL || '').replace(/\/+$/, '');
if(!url){
  console.error('RAILWAY_URL não definida');
  process.exit(1);
}
const txt = fs.readFileSync(vercelPath, 'utf8').replace(/__API_BASE__/g, url);
fs.writeFileSync(vercelPath, txt);
console.log('vercel.json patched ->', url);
