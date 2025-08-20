const planosService = require('./planos.service');

async function listarPlanos(req, res, next) {
  try {
    const { data, error } = await planosService.getAllPlanos();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function obterPlano(req, res, next) {
  try {
    const { data, error } = await planosService.getPlanoById(req.params.id);
    if (error) throw error;
    if (!data) return res.status(404).json({ message: 'Plano não encontrado' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function criarPlano(req, res, next) {
  try {
    const { data, error } = await planosService.createPlano(req.body);
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

async function atualizarPlano(req, res, next) {
  try {
    const { data, error } = await planosService.updatePlano(req.params.id, req.body);
    if (error) throw error;
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function removerPlano(req, res, next) {
  try {
    const { error } = await planosService.deletePlano(req.params.id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarPlanos,
  obterPlano,
  criarPlano,
  atualizarPlano,
  removerPlano,
};
