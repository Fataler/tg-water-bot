module.exports = {
    testEnvironment: 'node',
    coveragePathIgnorePatterns: ['/node_modules/'],
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    collectCoverage: true,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
};
