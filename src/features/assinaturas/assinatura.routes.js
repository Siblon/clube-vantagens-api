const router = require('express').Router();
const { requireAdminPin } = require('../../middlewares/adminPin');
const controller = require('./assinatura.controller.js');

// já publica o caminho completo
router.post(['/admin/assinatura', '/admin/assinaturas'], requireAdminPin, controller.create);

module.exports = router;
