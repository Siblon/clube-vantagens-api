const express = require('express');
const router = express.Router();

const assinaturaController = require('../controllers/assinaturaController');
const transacaoController = require('../controllers/transacaoController');

// Consultar cliente por CPF
router.get('/assinaturas', assinaturaController.consultarPorCpf);

// Listar todas as assinaturas
router.get('/assinaturas/listar', assinaturaController.listarTodas);

// Registrar transação
router.post('/transacao', transacaoController.registrar);

module.exports = router;
