const router = require('express').Router();
const { requireAdminPin } = require('../../middlewares/adminPin');
const controller = require('./assinatura.controller.js');
// este arquivo já define o caminho completo; não usar prefixo no server.js
router.post('/admin/assinatura', requireAdminPin, controller.create);
module.exports = router;
