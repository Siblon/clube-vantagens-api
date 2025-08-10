const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

const path = require('path');

// Servir a pasta pública com o painel
app.use(express.static(path.join(__dirname, 'public')));

// Rotas
app.use(routes);

console.log("✅ Passou por todos os middlewares... pronto pra escutar");

app.listen(PORT, () => {
  console.log(`API on http://localhost:${PORT}`);
  console.log('Supabase conectado →', process.env.SUPABASE_URL);
});
