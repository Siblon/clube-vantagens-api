import * as service from './assinatura.service.js';
import supabase from '../../../supabaseClient.js';
import { ZodError } from 'zod';

const META = { version: 'v0.1.0' };

export async function create(req, res) {
  if (supabase.assertSupabase && !supabase.assertSupabase(res)) return;
  try {
    const assinatura = await service.createAssinatura(req.body);
    res.status(201).json({ ok: true, data: assinatura, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    res.status(status).json({ ok: false, error: err.message, code: err.code });
  }
}

export default { create };
