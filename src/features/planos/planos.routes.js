const router = require('express').Router();
const ctrl = require('./planos.controller');
const { requireAdminPin } = require('../../middlewares/adminPin');

router.get('/planos', ctrl.listarPlanos);
router.get('/planos/:id', ctrl.obterPlano);
router.post('/planos', requireAdminPin, ctrl.criarPlano);
router.put('/planos/:id', requireAdminPin, ctrl.atualizarPlano);
router.delete('/planos/:id', requireAdminPin, ctrl.removerPlano);

module.exports = router;
