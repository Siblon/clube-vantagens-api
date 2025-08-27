const express = require('express');
const { requireAdminPin } = require('../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');

const router = express.Router();

// GET público
router.get('/', ctrl.getAll);

// admin com PIN
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

module.exports = router;
