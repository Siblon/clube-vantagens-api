const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/planosController');

router.get('/', ctrl.adminList);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.post('/rename', ctrl.rename);

module.exports = router;
