const service = require('./planos.service');

async function getAll(_req, res, next) {
  try {
    const { data } = await service.getAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { data } = await service.create(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { data } = await service.update(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { error } = await service.remove(req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  create,
  update,
  remove,
};
