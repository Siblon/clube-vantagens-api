const express = require('express');
const router = express.Router();

const assinaturaController = require('../controllers/assinaturaController');
const transacaoController = require('../controllers/transacaoController');
const adminController = require('../controllers/adminController');
const requireAdmin = require('../middlewares/requireAdmin');

// Consultar cliente por CPF
router.get('/assinaturas', assinaturaController.consultarPorCpf);

// Listar todas as assinaturas
router.get('/assinaturas/listar', assinaturaController.listarTodas);

// Registrar transação
router.post('/transacao', transacaoController.registrar);

// Seed clientes
router.post('/admin/seed', requireAdmin, adminController.seed);

module.exports = router;
