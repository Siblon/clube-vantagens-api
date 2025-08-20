const { ZodError } = require('zod');
const { setPrecoSchema } = require('./planos.schema.js');
const service = require('./planos.service');

const META = { version: 'v0.1.0' };

async function getAll(req, res) {
  try {
    const itens = await service.list();
    return res.json({ ok: true, data: itens, meta: META });
  } catch (err) {
    return res.status(err.status || 500).json({ ok: false, error: err.message, meta: META });
  }
}

async function setPreco(req, res) {
  try {
    const body = setPrecoSchema.parse(req.body);
    const cents = body.preco_centavos != null
      ? body.preco_centavos
      : Math.round(Number(body.preco_brl) * 100);

    const out = await service.setPreco({ nome: body.nome, preco_centavos: cents });
    return res.status(200).json({ ok: true, data: out, meta: META });
  } catch (err) {
    const status = err instanceof ZodError ? 400 : err.status || 500;
    return res.status(status).json({ ok: false, error: err.message, meta: META });
  }
}

module.exports = { getAll, setPreco };
