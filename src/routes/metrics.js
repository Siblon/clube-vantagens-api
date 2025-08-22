const router = require('express').Router();
const controller = require('../../controllers/metricsController');

router.get('/', controller.resume);
router.get('/csv', controller.csv);

module.exports = router;
