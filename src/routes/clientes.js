const router = require('express').Router();
const controller = require('../../controllers/clientesController');

router.get('/', controller.list);
router.post('/', controller.upsertOne);
router.post('/bulk', controller.bulkUpsert);
router.delete('/:cpf', controller.remove);
router.post('/generate-ids', controller.generateIds);

module.exports = router;
