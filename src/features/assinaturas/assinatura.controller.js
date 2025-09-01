const service = require('./assinatura.service.js');
const { supabase } = require('../../../utils/supabaseClient');
const { ZodError } = require('zod');

const META = { version: 'v0.1.0' };

async function create(req, res) {
    try {
    const assinatura = await service.createAssinatura(req.body, { supabase });
    return res.status(201).json({ ok: true, data: assinatura, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    return res.status(status).json({ ok: false, error: err.message, code: err.code, meta: META });
  }
}

module.exports = { create };
