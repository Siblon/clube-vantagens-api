module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  transform: {},
  testTimeout: 15000,
  moduleNameMapper: {
    '^\\./controllers/mpController$': '<rootDir>/tests/mocks/mpController.js',
  },
};
