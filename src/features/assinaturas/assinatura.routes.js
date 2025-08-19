const { Router } = require("express");
const { create } = require("./assinatura.controller.js");

const router = Router();

router.post('/', create);
module.exports = router;
