// models/data.js

const planos = {
  Essencial: {
    descontoLoja: 5,        // % de desconto no total da compra
    descontoProduto: 15     // % máximo em produtos especiais
  },
  Platinum: {
    descontoLoja: 10,
    descontoProduto: 35
  },
  Black: {
    descontoLoja: 20,
    descontoProduto: 50
  }
};

const clientes = [
  { nome: 'Maria Silva', cpf: '12345678900', plano: 'Essencial' },
  { nome: 'João Santos', cpf: '98765432100', plano: 'Platinum' },
  { nome: 'Carla Nunes', cpf: '11122233344', plano: 'Black' }
];

module.exports = {
  planos,
  clientes
};
