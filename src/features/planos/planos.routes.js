const router = require('express').Router();
const ctrl = require('./planos.controller');

router.get('/planos', ctrl.listarPlanos);
router.get('/planos/:id', ctrl.obterPlano);
router.post('/planos', ctrl.criarPlano);
router.put('/planos/:id', ctrl.atualizarPlano);
router.delete('/planos/:id', ctrl.removerPlano);

module.exports = router;
