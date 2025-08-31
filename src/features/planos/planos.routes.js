const express = require('express');
const requireAdminPin = require('../../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');

const router = express.Router();

// Endpoint simples para diagnóstico
router.get('/', (_req, res) => {
  res.json({ ok: true, source: 'planos.routes' });
});

// admin com PIN
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

module.exports = router;
