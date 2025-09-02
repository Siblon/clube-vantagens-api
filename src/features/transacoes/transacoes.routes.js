const express = require('express');
const ctrl = require('./transacoes.controller');

const router = express.Router();

router.post('/preview', ctrl.preview);
router.post('/', ctrl.create);

module.exports = router;
