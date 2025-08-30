const router = require('express').Router();
const { createCliente } = require('../controllers/clientesController');

router.post('/clientes', createCliente);

module.exports = router;
