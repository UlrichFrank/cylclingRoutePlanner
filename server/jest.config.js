export default {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {},
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  globalSetup: '<rootDir>/jest.globalSetup.js',
  globalTeardown: '<rootDir>/jest.globalTeardown.js',
};
