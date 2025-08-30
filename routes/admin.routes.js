const router = require('express').Router();
const c = require('../controllers/clientesController');

router.get('/', c.list);
router.post('/', c.upsertOne); // mantém create via upsert
router.put('/:cpf', c.upsertOne);
router.delete('/:cpf', c.remove);
router.post('/bulk', c.bulkUpsert);
router.post('/generate-ids', c.generateIds);

module.exports = router;
