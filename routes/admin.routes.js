const router = require('express').Router();
const { createCliente } = require('../controllers/clientesController');

// POST /admin/clientes → cria cliente
router.post('/clientes', createCliente);

module.exports = router;
