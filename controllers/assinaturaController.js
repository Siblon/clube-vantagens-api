const { planos } = require('../models/data');

exports.listarTodas = (req, res) => {
  res.json(planos);
};
