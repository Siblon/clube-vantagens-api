const router = require('express').Router();
const { requireAdminPin } = require('../../middlewares/adminPin.js');
const ctrl = require('./planos.controller.js');

// Caminhos completos (sem prefixo no server.js)
router.get('/admin/planos', requireAdminPin, ctrl.getAll);
router.post('/admin/planos/preco', requireAdminPin, ctrl.setPreco);

module.exports = router;
