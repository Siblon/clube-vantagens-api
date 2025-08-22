const express = require('express');
const router = express.Router();
const { create } = require('./assinatura.controller.js');

// permite chamadas com e sem prefixo /admin, em formas singular e plural
router.post(['/', '/assinatura', '/assinaturas', '/admin/assinatura', '/admin/assinaturas'], create);

module.exports = router;
