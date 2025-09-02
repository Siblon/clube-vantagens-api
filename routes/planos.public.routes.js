const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/planosController');
router.get('/', ctrl.publicList);
module.exports = router;
