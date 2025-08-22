const router = require('express').Router();
const controller = require('../../controllers/leadController');
const { requireAdminPin } = require('../middlewares/adminPin');

router.post('/lead', controller.publicCreate);
router.get('/leads', requireAdminPin, controller.adminList);
router.get('/leads.csv', requireAdminPin, controller.adminExportCsv);
router.post('/leads/approve', requireAdminPin, controller.adminApprove);
router.post('/leads/discard', requireAdminPin, controller.adminDiscard);

module.exports = router;
