module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  transform: {},
  testTimeout: 20000,
  moduleNameMapper: {
    '^\\./controllers/mpController$': '<rootDir>/tests/mocks/mpController.js',
  },
};
