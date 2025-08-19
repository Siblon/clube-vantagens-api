const { Router } = require('express');
const controller = require('./assinatura.controller.js');
const { requireAdminPin: adminPin } = require('../../middlewares/adminPin.js');

const router = Router();

router.post('/admin/assinatura', adminPin, controller.create);

module.exports = router;

