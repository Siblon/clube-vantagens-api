const service = require('./assinatura.service.js');
const supabase = require('../../../supabaseClient.js');
const { ZodError } = require('zod');

const META = { version: 'v0.1.0' };

async function create(req, res) {
  if (supabase.assertSupabase && !supabase.assertSupabase(res)) return;
  try {
    const assinatura = await service.createAssinatura(req.body, { supabase });
    res.status(201).json({ ok: true, data: assinatura, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    res.status(status).json({ ok: false, error: err.message, code: err.code });
  }
}

module.exports = { create };
