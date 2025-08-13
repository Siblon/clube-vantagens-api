const express = require('express');
const router = express.Router();

const { registrarTransacao } = require('../controllers/transacaoController');

router.post('/', registrarTransacao);

module.exports = router;
