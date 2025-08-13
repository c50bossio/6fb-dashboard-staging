/**
 * COMPREHENSIVE TEST AUTOMATION CONFIGURATION
 * 
 * Centralized configuration for automated test generation and execution
 * Supports unit, integration, E2E, performance, and security testing
 */

const testConfig = {
  // Test Coverage Requirements
  coverage: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    critical: {
      // NuclearInput requires 95% coverage
      'components/NuclearInput.js': {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      },
      // AI components require high coverage
      'components/ai/**/*.js': {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      },
      // Business intelligence requires high coverage
      'components/PredictiveAnalyticsDashboard.js': {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90
      }
    }
  },

  // Test Execution Strategy
  execution: {
    parallel: true,
    maxWorkers: '50%',
    testTimeout: 30000,
    setupFilesAfterEnv: ['<rootDir>/test-utils/jest.setup.js'],
    
    // Test patterns by type
    patterns: {
      unit: '**/*.unit.test.js',
      integration: '**/*.integration.test.js',
      e2e: '**/*.spec.js',
      performance: '**/performance/*.test.js',
      security: '**/security/*.test.js'
    }
  },

  // AI-Specific Test Configuration
  ai: {
    models: ['gpt-5', 'claude-opus-4.1', 'gemini-2.0-flash'],
    responseTimeThresholds: {
      'gpt-5': 5000,
      'claude-opus-4.1': 5000,
      'gemini-2.0-flash': 3000
    },
    testContexts: [
      'revenue_analysis',
      'customer_behavior',
      'demand_prediction',
      'pricing_optimization'
    ],
    mockResponses: {
      enabled: false, // Use real AI APIs for comprehensive testing
      fallbackEnabled: true
    }
  },

  // Business Intelligence Test Configuration
  businessIntelligence: {
    kpiThresholds: {
      prediction_accuracy: 90,
      response_time: 3000,
      data_freshness: 300 // 5 minutes
    },
    testDataSets: [
      'demo_barbershop_data',
      'enterprise_multi_location',
      'single_barber_shop',
      'franchise_chain'
    ],
    analyticsEndpoints: [
      '/api/ai/predictive',
      '/api/ai/predictive-analytics',
      '/api/business-data/revenue_metrics',
      '/api/business-data/customer_analytics'
    ]
  },

  // Performance Test Configuration
  performance: {
    thresholds: {
      ai_response_max: 5000,
      dashboard_load_max: 3000,
      api_response_max: 1000,
      memory_usage_max: 500 * 1024 * 1024,
      concurrent_requests_min: 10
    },
    loadTesting: {
      concurrent_users: [1, 5, 10, 20, 50],
      duration: 60, // seconds
      rampUp: 30 // seconds
    },
    monitoring: {
      metrics: ['response_time', 'memory_usage', 'cpu_usage', 'error_rate'],
      alertThresholds: {
        response_time: 10000,
        error_rate: 0.05,
        memory_usage: 0.8
      }
    }
  },

  // Security Test Configuration
  security: {
    testTypes: [
      'prompt_injection',
      'sql_injection',
      'xss_protection',
      'data_leakage',
      'authorization',
      'rate_limiting',
      'input_validation'
    ],
    compliance: {
      gdpr: true,
      hipaa: false,
      pci_dss: true,
      soc2: true
    },
    scanTools: {
      sast: ['bandit', 'semgrep'],
      dast: ['zap', 'custom'],
      dependency: ['audit', 'safety']
    }
  },

  // Browser Testing Configuration
  browsers: {
    chromium: {
      enabled: true,
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    },
    firefox: {
      enabled: true,
      headless: true
    },
    webkit: {
      enabled: true,
      headless: true
    }
  },

  // Mobile Testing Configuration
  mobile: {
    devices: [
      'iPhone 12',
      'iPhone 12 Pro',
      'Pixel 5',
      'Samsung Galaxy S21',
      'iPad Pro'
    ],
    viewports: [
      { width: 375, height: 667 }, // iPhone SE
      { width: 390, height: 844 }, // iPhone 12
      { width: 393, height: 851 }, // Pixel 5
      { width: 768, height: 1024 } // iPad
    ]
  },

  // Test Environment Configuration
  environments: {
    development: {
      baseUrl: 'http://localhost:9999',
      apiUrl: 'http://localhost:8001',
      database: 'sqlite',
      ai_providers: ['openai', 'anthropic', 'google']
    },
    staging: {
      baseUrl: 'https://staging.6fb-ai-system.com',
      apiUrl: 'https://api-staging.6fb-ai-system.com',
      database: 'postgresql',
      ai_providers: ['openai', 'anthropic', 'google']
    },
    production: {
      baseUrl: 'https://6fb-ai-system.com',
      apiUrl: 'https://api.6fb-ai-system.com',
      database: 'postgresql',
      ai_providers: ['openai', 'anthropic', 'google'],
      monitoring: true
    }
  },

  // Test Data Management
  testData: {
    generation: {
      automated: true,
      realistic: true,
      anonymized: true
    },
    cleanup: {
      afterEach: false,
      afterAll: true,
      production: false
    },
    fixtures: {
      barbershops: 'test-data/barbershops.json',
      customers: 'test-data/customers.json',
      appointments: 'test-data/appointments.json',
      analytics: 'test-data/analytics.json'
    }
  },

  // Reporting Configuration
  reporting: {
    formats: ['html', 'json', 'junit'],
    outputDir: 'test-results',
    coverage: {
      reporters: ['text', 'lcov', 'html'],
      outputDir: 'coverage'
    },
    performance: {
      outputFile: 'performance-report.json',
      dashboard: true
    },
    security: {
      outputFile: 'security-report.json',
      sarif: true
    }
  },

  // CI/CD Integration
  cicd: {
    jenkins: {
      pipeline: 'tests/ci/Jenkinsfile',
      parallel: true,
      archiveArtifacts: true
    },
    github: {
      workflow: '.github/workflows/test.yml',
      matrix: true,
      cacheEnabled: true
    },
    docker: {
      testImage: 'node:18-alpine',
      services: ['postgres', 'redis']
    }
  },

  // Test Automation Scripts
  scripts: {
    generate: {
      unit: 'npm run test:generate:unit',
      integration: 'npm run test:generate:integration',
      e2e: 'npm run test:generate:e2e'
    },
    execute: {
      all: 'npm run test:all',
      unit: 'npm run test:unit',
      integration: 'npm run test:integration',
      e2e: 'npm run test:e2e',
      performance: 'npm run test:performance',
      security: 'npm run test:security'
    },
    report: {
      coverage: 'npm run test:coverage',
      performance: 'npm run test:performance:report',
      security: 'npm run test:security:report'
    }
  }
}

// Validation Rules for Test Configuration
const validationRules = {
  coverageThresholds: (config) => {
    const global = config.coverage.global
    const requiredKeys = ['branches', 'functions', 'lines', 'statements']
    
    for (const key of requiredKeys) {
      if (!global[key] || global[key] < 0 || global[key] > 100) {
        throw new Error(`Invalid coverage threshold for ${key}: ${global[key]}`)
      }
    }
    
    return true
  },
  
  aiModelConfiguration: (config) => {
    const models = config.ai.models
    const supportedModels = ['gpt-5', 'claude-opus-4.1', 'gemini-2.0-flash']
    
    for (const model of models) {
      if (!supportedModels.includes(model)) {
        throw new Error(`Unsupported AI model: ${model}`)
      }
    }
    
    return true
  },
  
  performanceThresholds: (config) => {
    const thresholds = config.performance.thresholds
    
    if (thresholds.ai_response_max > 30000) {
      console.warn('AI response threshold > 30s may indicate performance issues')
    }
    
    if (thresholds.dashboard_load_max > 10000) {
      console.warn('Dashboard load threshold > 10s may affect user experience')
    }
    
    return true
  }
}

// Test Configuration Validator
function validateConfig(config) {
  console.log('Validating test configuration...')
  
  try {
    validationRules.coverageThresholds(config)
    validationRules.aiModelConfiguration(config)
    validationRules.performanceThresholds(config)
    
    console.log('✅ Test configuration validation passed')
    return true
  } catch (error) {
    console.error('❌ Test configuration validation failed:', error.message)
    return false
  }
}

// Export configuration
module.exports = {
  testConfig,
  validateConfig,
  
  // Helper functions for test automation
  getTestPattern: (testType) => testConfig.execution.patterns[testType],
  getEnvironmentConfig: (env) => testConfig.environments[env],
  getCoverageThreshold: (component) => testConfig.coverage.critical[component] || testConfig.coverage.global,
  
  // Test execution helpers
  shouldRunTest: (testType, environment) => {
    if (environment === 'production' && ['security', 'performance'].includes(testType)) {
      return false // Don't run destructive tests in production
    }
    return true
  },
  
  getTestTimeout: (testType) => {
    const timeouts = {
      unit: 5000,
      integration: 15000,
      e2e: 30000,
      performance: 120000,
      security: 60000
    }
    return timeouts[testType] || testConfig.execution.testTimeout
  }
}

// Auto-validate configuration on load
if (require.main === module) {
  validateConfig(testConfig)
}