const express = require('express');
const { createCliente } = require('../controllers/clientesController');

const router = express.Router();

router.post('/clientes', createCliente);

module.exports = router;
