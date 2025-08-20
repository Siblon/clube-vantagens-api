module.exports = {
  testEnvironment: 'node',
  verbose: true,
  setupFiles: ['dotenv/config'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js', '**/__tests__/**/*.test.js'],
  transform: {},
  testTimeout: 15000,
  moduleNameMapper: {
    '^\\./controllers/mpController$': '<rootDir>/tests/mocks/mpController.js',
    '^config/(.*)$': '<rootDir>/config/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
};
