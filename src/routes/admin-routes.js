const router = require('express').Router();
const controller = require('../../controllers/adminController');

router.post('/seed', controller.seed);
router.post('/clientes/bulk', controller.bulkClientes);
router.post('/clientes/generate-ids', controller.generateIds);

module.exports = router;
