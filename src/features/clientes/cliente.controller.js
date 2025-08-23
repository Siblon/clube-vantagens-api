const service = require('./cliente.service.js');
let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../../../config/supabase'));
}
const { ZodError } = require('zod');

const META = { version: 'v0.1.0' };

async function create(req, res) {
  if (supabase.assertSupabase && !supabase.assertSupabase(res)) return;
  try {
    const cliente = await service.createCliente(req.body);
    res.status(201).json({ ok: true, data: cliente, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    res.status(status).json({ ok: false, error: err.message, code: err.code });
  }
}

module.exports = { create };
