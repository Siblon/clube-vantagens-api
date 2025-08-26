const express = require('express');
const router = express.Router();
const { requireAdminPin } = require('../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');

router.get('/', ctrl.getAll);
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

module.exports = router;
