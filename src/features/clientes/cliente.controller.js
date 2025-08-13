import * as service from './cliente.service.js';
import supabase from '../../../supabaseClient.js';

const META = { version: 'v0.1.0' };

export async function create(req, res) {
  if (supabase.assertSupabase && !supabase.assertSupabase(res)) return;
  try {
    const cliente = await service.createCliente(req.body);
    res.status(201).json({ ok: true, data: cliente, meta: META });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ ok: false, error: err.message, code: err.code });
  }
}

export default { create };
