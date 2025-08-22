const router = require('express').Router();
const controller = require('../../controllers/statusController');

router.get('/', controller.info);
router.get('/supabase', controller.pingSupabase);

module.exports = router;
