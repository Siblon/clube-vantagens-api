const express = require('express');
const router = express.Router();
const { create } = require('./assinatura.controller.js');
const { requireAdminPin } = require('../../middlewares/adminPin.js');

router.post(['/admin/assinatura', '/admin/assinaturas'], requireAdminPin, create);

module.exports = router;
