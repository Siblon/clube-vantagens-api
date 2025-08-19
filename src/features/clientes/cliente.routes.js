const { Router } = require("express");
const { create } = require("./cliente.controller.js");

const router = Router();

router.post('/', create);
module.exports = router;
