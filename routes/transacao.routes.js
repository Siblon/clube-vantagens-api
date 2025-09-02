const express = require('express');
const router = express.Router();

// controllers/transacaoController.js já exporta um router
module.exports = require('../controllers/transacaoController');
