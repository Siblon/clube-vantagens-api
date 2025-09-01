const service = require('./cliente.service.js');
const { supabase } = require('../../../utils/supabaseClient');
const { ZodError } = require('zod');

const META = { version: 'v0.1.0' };

async function create(req, res) {
    try {
    const cliente = await service.createCliente(req.body);
    res.status(201).json({ ok: true, data: cliente, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    res.status(status).json({ ok: false, error: err.message, code: err.code });
  }
}

module.exports = { create };
