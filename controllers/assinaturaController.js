const { clientes } = require('../models/data');

exports.listarTodas = (req, res) => {
  res.json(clientes);
};
