const router = require('express').Router();
const c = require('../controllers/clientesController');
const { requireAdminPin } = require('../middlewares/requireAdminPin');

router.get('/', requireAdminPin, c.list);
router.post('/', requireAdminPin, c.upsertOne);
router.post('/bulk', requireAdminPin, c.bulkUpsert);
router.delete('/:cpf', requireAdminPin, c.remove);
router.post('/generate-ids', requireAdminPin, c.generateIds);

module.exports = router;
