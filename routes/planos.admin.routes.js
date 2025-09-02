const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/planosController');

router.get('/', ctrl.adminList);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/rename', ctrl.rename);

module.exports = router;
