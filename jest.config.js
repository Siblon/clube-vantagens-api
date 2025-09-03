module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['<rootDir>/tests/test-env.js', 'dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  transform: {},
  testTimeout: 15000,
  moduleNameMapper: {
    '^\\./controllers/mpController$': '<rootDir>/tests/mocks/mpController.js',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
};
