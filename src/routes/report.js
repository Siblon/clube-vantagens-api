const router = require('express').Router();
const controller = require('../../controllers/reportController');

router.get('/', controller.resumo);
router.get('/csv', controller.csv);

module.exports = router;
