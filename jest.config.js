module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'ts'],
  
  // Root directory for tests
  rootDir: 'src',
  
  // Test regex pattern
  testRegex: '.*\.spec\.ts$',
  
  // Transform configuration
  transform: {
    '^.+\.(t|j)s$': 'ts-jest',
  },
  
  // Coverage configuration
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.schema.ts',
    '!**/main.ts',
    '!**/*.config.ts',
  ],
  
  // Coverage directory
  coverageDirectory: '../coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],
  
  // Module name mapping for path aliases
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/../test/global-setup.ts',
  globalTeardown: '<rootDir>/../test/global-teardown.ts',
  
  // Test results processor for SonarQube (commented out as package not installed)
  // testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporters
  reporters: [
    'default'
  ],
  
  // Watch plugins for better development experience (commented out as packages not installed)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname',
  // ],
};