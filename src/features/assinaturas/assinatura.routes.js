// src/features/assinaturas/assinatura.routes.js
const router = require('express').Router();
const { requireAdminPin } = require('../../middlewares/adminPin'); // <- este mesmo middleware
const controller = require('./assinatura.controller.js');

// Este arquivo já expõe o caminho completo.
// NÃO monte com prefixo no server.js.
router.post('/admin/assinatura', requireAdminPin, controller.create);

module.exports = router;
