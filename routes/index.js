const express = require('express');
const router = express.Router();

const clienteController = require('../controllers/clienteController');
const assinaturaController = require('../controllers/assinaturaController');
const transacaoController = require('../controllers/transacaoController');

// Buscar cliente por CPF
router.get('/cliente/:cpf', clienteController.buscarPorCpf);

// Listar todas assinaturas
router.get('/assinaturas', assinaturaController.listarTodas);

// Registrar transação
router.post('/transacao', transacaoController.registrar);

module.exports = router;
