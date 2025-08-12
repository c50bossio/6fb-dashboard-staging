// Production Deployment Configuration
// Settings for deploying the campaign and billing system to production

module.exports = {
  // Application metadata
  app: {
    name: '6FB AI Agent System',
    version: '1.0.0',
    description: 'Enterprise-grade barbershop management with AI and marketing capabilities',
    author: 'BookedBarber Team',
    repository: 'https://github.com/bookedbarber/6fb-ai-agent-system'
  },

  // Deployment environments
  environments: {
    development: {
      name: 'Development',
      url: 'http://localhost:9999',
      apiUrl: 'http://localhost:9999/api',
      database: 'sqlite',
      mockServices: true,
      monitoring: false,
      rateLimit: false
    },
    staging: {
      name: 'Staging',
      url: 'https://staging.bookedbarber.com',
      apiUrl: 'https://staging.bookedbarber.com/api',
      database: 'postgresql',
      mockServices: false,
      monitoring: true,
      rateLimit: true,
      env: {
        NODE_ENV: 'staging',
        NEXT_PUBLIC_API_URL: 'https://staging.bookedbarber.com/api',
        DATABASE_URL: '${STAGING_DATABASE_URL}',
        SENDGRID_API_KEY: '${STAGING_SENDGRID_KEY}',
        TWILIO_ACCOUNT_SID: '${STAGING_TWILIO_SID}',
        STRIPE_SECRET_KEY: '${STAGING_STRIPE_KEY}'
      }
    },
    production: {
      name: 'Production',
      url: 'https://bookedbarber.com',
      apiUrl: 'https://api.bookedbarber.com',
      database: 'postgresql',
      mockServices: false,
      monitoring: true,
      rateLimit: true,
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://api.bookedbarber.com',
        DATABASE_URL: '${PRODUCTION_DATABASE_URL}',
        SENDGRID_API_KEY: '${PRODUCTION_SENDGRID_KEY}',
        TWILIO_ACCOUNT_SID: '${PRODUCTION_TWILIO_SID}',
        STRIPE_SECRET_KEY: '${PRODUCTION_STRIPE_KEY}',
        SENTRY_DSN: '${PRODUCTION_SENTRY_DSN}',
        POSTHOG_KEY: '${PRODUCTION_POSTHOG_KEY}'
      }
    }
  },

  // Infrastructure configuration
  infrastructure: {
    // Container settings
    docker: {
      registry: 'docker.io/bookedbarber',
      images: {
        frontend: 'bookedbarber/6fb-frontend:latest',
        backend: 'bookedbarber/6fb-backend:latest'
      },
      compose: {
        version: '3.8',
        services: {
          frontend: {
            ports: ['9999:9999'],
            environment: ['NODE_ENV', 'NEXT_PUBLIC_API_URL'],
            healthcheck: {
              test: 'curl -f http://localhost:9999/api/health || exit 1',
              interval: '30s',
              timeout: '10s',
              retries: 3
            }
          },
          backend: {
            ports: ['8001:8000'],
            environment: ['NODE_ENV', 'DATABASE_URL', 'REDIS_URL'],
            healthcheck: {
              test: 'curl -f http://localhost:8000/health || exit 1',
              interval: '30s',
              timeout: '10s',
              retries: 3
            }
          }
        }
      }
    },

    // Cloud providers
    cloud: {
      provider: 'vercel', // or 'aws', 'gcp', 'azure'
      regions: ['us-east-1', 'eu-west-1'],
      scaling: {
        min: 1,
        max: 10,
        targetCPU: 70,
        targetMemory: 80
      }
    },

    // Database configuration
    database: {
      provider: 'supabase',
      plan: 'pro', // 'free', 'pro', 'team', 'enterprise'
      backups: {
        enabled: true,
        frequency: 'daily',
        retention: 30 // days
      },
      replication: {
        enabled: true,
        readReplicas: 2
      }
    },

    // CDN configuration
    cdn: {
      provider: 'cloudflare',
      caching: {
        static: '1y',
        api: '0',
        html: '10m'
      },
      compression: true,
      minification: true
    },

    // Monitoring
    monitoring: {
      apm: 'sentry',
      analytics: 'posthog',
      uptime: 'pingdom',
      logs: 'datadog'
    }
  },

  // Security configuration
  security: {
    // SSL/TLS
    ssl: {
      enabled: true,
      provider: 'letsencrypt',
      autoRenew: true
    },

    // Headers
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.segment.com; style-src 'self' 'unsafe-inline';"
    },

    // Rate limiting
    rateLimiting: {
      enabled: true,
      rules: {
        api: '60/minute',
        auth: '5/minute',
        campaigns: '10/hour'
      }
    },

    // Secrets management
    secrets: {
      provider: 'vault', // or 'aws-secrets-manager', 'azure-key-vault'
      rotation: {
        enabled: true,
        frequency: 90 // days
      }
    }
  },

  // Deployment scripts
  scripts: {
    // Pre-deployment
    preDeploy: [
      'npm run test',
      'npm run lint',
      'npm run build',
      'npm run test:e2e'
    ],

    // Deployment
    deploy: {
      staging: [
        'docker build -t bookedbarber/6fb-frontend:staging .',
        'docker push bookedbarber/6fb-frontend:staging',
        'kubectl apply -f k8s/staging/',
        'kubectl rollout status deployment/frontend-staging'
      ],
      production: [
        'docker build -t bookedbarber/6fb-frontend:latest .',
        'docker push bookedbarber/6fb-frontend:latest',
        'kubectl apply -f k8s/production/',
        'kubectl rollout status deployment/frontend-production'
      ]
    },

    // Post-deployment
    postDeploy: [
      'npm run health-check',
      'npm run smoke-test',
      'npm run notify-team'
    ],

    // Rollback
    rollback: [
      'kubectl rollout undo deployment/frontend-production',
      'npm run notify-team --message="Rollback initiated"'
    ]
  },

  // Health checks
  healthChecks: {
    endpoints: [
      {
        name: 'Frontend Health',
        url: '/api/health',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'Backend Health',
        url: '/health',
        expectedStatus: 200,
        timeout: 5000
      },
      {
        name: 'Database Health',
        url: '/api/health/database',
        expectedStatus: 200,
        timeout: 10000
      },
      {
        name: 'Campaign API',
        url: '/api/marketing/campaigns/health',
        expectedStatus: 200,
        timeout: 5000
      }
    ],
    interval: 60000, // 1 minute
    retries: 3,
    alerting: {
      enabled: true,
      channels: ['email', 'slack', 'pagerduty']
    }
  },

  // Feature flags
  featureFlags: {
    provider: 'vercel', // or 'launchdarkly', 'split.io'
    flags: {
      'email-campaigns': {
        default: true,
        staging: true,
        production: true
      },
      'sms-campaigns': {
        default: true,
        staging: true,
        production: true
      },
      'automated-campaigns': {
        default: false,
        staging: true,
        production: false
      },
      'advanced-analytics': {
        default: false,
        staging: true,
        production: true
      },
      'bulk-operations': {
        default: false,
        staging: false,
        production: false
      }
    }
  },

  // Backup and disaster recovery
  backup: {
    database: {
      enabled: true,
      frequency: 'daily',
      retention: 30, // days
      locations: ['us-east-1', 'eu-west-1'],
      encryption: true
    },
    files: {
      enabled: true,
      frequency: 'weekly',
      retention: 90, // days
      includes: ['uploads/', 'exports/'],
      excludes: ['temp/', 'cache/']
    }
  },

  // Performance targets
  performance: {
    targets: {
      ttfb: 200, // Time to first byte (ms)
      fcp: 1500, // First contentful paint (ms)
      lcp: 2500, // Largest contentful paint (ms)
      tti: 3500, // Time to interactive (ms)
      cls: 0.1, // Cumulative layout shift
      fid: 100 // First input delay (ms)
    },
    budgets: {
      javascript: 500, // KB
      css: 100, // KB
      images: 1000, // KB
      total: 2000 // KB
    }
  },

  // Compliance
  compliance: {
    gdpr: {
      enabled: true,
      dataRetention: 730, // days
      consentRequired: true,
      rightToErasure: true
    },
    ccpa: {
      enabled: true,
      optOutRequired: true
    },
    hipaa: {
      enabled: false
    },
    pci: {
      enabled: true,
      level: 4 // SAQ-A compliance
    }
  },

  // Notification settings
  notifications: {
    deployments: {
      enabled: true,
      channels: ['slack', 'email'],
      recipients: ['devops@bookedbarber.com', '#deployments']
    },
    errors: {
      enabled: true,
      channels: ['pagerduty', 'slack'],
      severity: 'critical',
      recipients: ['oncall@bookedbarber.com', '#alerts']
    },
    performance: {
      enabled: true,
      channels: ['datadog', 'slack'],
      thresholds: {
        responseTime: 1000, // ms
        errorRate: 0.01, // 1%
        availability: 0.999 // 99.9%
      }
    }
  }
};