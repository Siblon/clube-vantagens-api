export default {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {},
  testTimeout: 15000,
  // Map opcional: se existir mock de mpController, habilite-o descomentando a linha
  // moduleNameMapper: {
  //   '^./controllers/mpController$': '<rootDir>/tests/mocks/mpController.js'
  // }
};
