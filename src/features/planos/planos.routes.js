const express = require('express');
// Router exportado via CommonJS
const { requireAdminPin } = require('../../middlewares/requireAdminPin.js');
const ctrl = require('./planos.controller.js');

const router = express.Router();

// rota pública mínima apenas para teste de wiring
router.get('/__debug', (_req, res) => res.json({ ok: true, itens: [] }));

// GET público real
router.get('/', ctrl.getAll);

// admin com PIN
router.post('/', requireAdminPin, ctrl.create);
router.put('/:id', requireAdminPin, ctrl.update);
router.delete('/:id', requireAdminPin, ctrl.remove);

// exporta o router de forma inequívoca
module.exports = router;
