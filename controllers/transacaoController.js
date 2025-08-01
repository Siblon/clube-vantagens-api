const { clientes, planos } = require('../models/data');

exports.registrar = (req, res) => {
  const { cpf, valor } = req.body;

  if (!cpf || typeof valor !== 'number' || isNaN(valor)) {
    return res.status(400).json({ error: 'CPF e valor são obrigatórios e o valor deve ser numérico' });
  }

  const cliente = clientes.find(c => c.cpf === cpf);
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente não encontrado' });
  }

  const plano = planos[cliente.plano];
  if (!plano) {
    return res.status(500).json({ error: 'Plano inválido' });
  }

  const descontoPercentual = plano.descontoLoja;
  const valorDesconto = (valor * descontoPercentual) / 100;
  const valorFinal = valor - valorDesconto;

  const transacao = {
    cliente: cliente.nome,
    cpf: cliente.cpf,
    plano: cliente.plano,
    valorOriginal: valor,
    descontoAplicado: `${descontoPercentual}%`,
    valorFinal
  };

  res.json(transacao);
};
