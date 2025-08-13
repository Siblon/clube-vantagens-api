const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/transacaoController');

router.get('/preview', ctrl.preview);
router.post('/', ctrl.criar);

module.exports = router;
