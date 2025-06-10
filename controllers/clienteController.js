const { clientes } = require('../models/data');

exports.buscarPorCpf = (req, res) => {
  const cpf = req.params.cpf;
  const cliente = clientes.find(c => c.cpf === cpf);

  if (!cliente) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  res.json(cliente);
};
