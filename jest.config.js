const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/test-utils/jest.setup.js'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/tests/',
    '<rootDir>/playwright.config.js',
    '<rootDir>/supabase-mcp/',
    '<rootDir>/__tests__/security/comprehensive-security-test.spec.js',
    '<rootDir>/__tests__/security/security_tests.spec.js',
    '<rootDir>/__tests__/performance/load_testing.spec.js',
    '<rootDir>/test-auto-formatting.spec.js',
    '<rootDir>/__tests__/e2e/critical_user_workflows.spec.js',
    '<rootDir>/__tests__/security/config/',
    '<rootDir>/__tests__/security/sast-dast/',
    '<rootDir>/__tests__/security/reporting/',
    '<rootDir>/__tests__/security/gdpr-compliance/',
    '<rootDir>/__tests__/security/api-security/',
    '<rootDir>/__tests__/security/monitoring/',
    '<rootDir>/__tests__/security/penetration-testing/',
    '<rootDir>/__tests__/security/security-test-orchestrator.js',
    '<rootDir>/__tests__/utils/test-helpers.js',
    '<rootDir>/__tests__/security/ci-cd/'
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'services/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/test-utils/**',
    '!**/__tests__/**',
    '!**/types/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1'
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react|@heroicons|recharts)/)'
  ]
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)