const express = require('express');
const requireAdminPin = require('../../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');
const { PLANOS_ACEITOS } = require('../../../controllers/clientesController.js');

const router = express.Router();

// Lista de planos aceitos
router.get('/', (_req, res) => {
  res.json({ ok: true, planos: PLANOS_ACEITOS });
});

// admin com PIN
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

module.exports = router;
