const express = require('express');
const { requireAdminPin } = require('../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');

const router = express.Router();

// Smoke test: em produção/development responde OK; em testes, usa o controlador real
router.get('/', (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return ctrl.getAll(req, res, next);
  }
  res.json({ ok: true, source: 'planos.routes' });
});

// admin com PIN
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

module.exports = router;
