const router = require('express').Router();
const c = require('../controllers/clientesController');
router.get('/clientes', c.list);
router.post('/clientes', c.upsertOne);      // mantém create via upsert
router.put('/clientes/:cpf', c.upsertOne);
router.delete('/clientes/:cpf', c.remove);
router.post('/clientes:bulk', c.bulkUpsert);
router.post('/clientes:generate-ids', c.generateIds);
module.exports = router;
