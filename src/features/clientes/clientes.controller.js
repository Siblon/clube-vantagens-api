const { ClienteCreateSchema, ClienteUpdateSchema } = require('./clientes.validation');
const service = require('./clientes.service');

function ok(res, data) {
  return res.json({ ok: true, data });
}
function fail(res, status, error) {
  return res.status(status).json({ ok: false, error: String(error?.message || error) });
}

async function list(req, res) {
  try {
    const { q, limit, offset } = req.query;
    const parsedLimit = Number(limit) > 0 ? Number(limit) : 50;
    const parsedOffset = Number(offset) >= 0 ? Number(offset) : 0;
    const out = await service.list({ q, limit: parsedLimit, offset: parsedOffset });
    return ok(res, out);
  } catch (err) {
    return fail(res, 500, err);
  }
}

async function get(req, res) {
  try {
    const { id } = req.params;
    const row = await service.getById(id);
    return ok(res, row);
  } catch (err) {
    return fail(res, 404, err);
  }
}

async function create(req, res) {
  try {
    const parsed = ClienteCreateSchema.parse(req.body || {});
    const created = await service.create(parsed);
    return res.status(201).json({ ok: true, data: created });
  } catch (err) {
    const status = err?.name === 'ZodError' ? 400 : 500;
    return fail(res, status, err);
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const parsed = ClienteUpdateSchema.parse(req.body || {});
    const updated = await service.update(id, parsed);
    return ok(res, updated);
  } catch (err) {
    const status = err?.name === 'ZodError' ? 400 : 404;
    return fail(res, status, err);
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;
    const out = await service.remove(id);
    if (!out.deleted) return fail(res, 404, new Error('Cliente não encontrado'));
    return ok(res, out);
  } catch (err) {
    return fail(res, 500, err);
  }
}

module.exports = {
  list,
  get,
  create,
  update,
  remove,
};
