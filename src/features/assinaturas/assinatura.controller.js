const service = require('./assinatura.service.js');
let supabase;
try {
  ({ supabase } = require('config/supabase'));
} catch (_e) {
  ({ supabase } = require('../../../config/supabase'));
}
const { ZodError } = require('zod');

const META = { version: 'v0.1.0' };

async function create(req, res) {
  if (typeof supabase.assertSupabase === 'function') {
    const ok = supabase.assertSupabase(res);
    if (!ok) return;
  }
  try {
    const assinatura = await service.createAssinatura(req.body, { supabase });
    return res.status(201).json({ ok: true, data: assinatura, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    return res.status(status).json({ ok: false, error: err.message, code: err.code, meta: META });
  }
}

module.exports = { create };
