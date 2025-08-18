// jest.config.mjs
export default {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'],              // carrega variáveis do .env (ou .env.test)
  testMatch: ['**/tests/**/*.test.js'],       // coloque seus testes dentro de /tests
  transform: {},                              // sem Babel por enquanto
  // aumenta se algum teste precisar mais tempo (ex.: SDKs mockados)
  testTimeout: 15000,
};
