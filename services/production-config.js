
const isDevelopment = process.env.NODE_ENV === 'development';
const isStaging = process.env.NODE_ENV === 'staging';
const isProduction = process.env.NODE_ENV === 'production';

const config = {
  environment: {
    isDevelopment,
    isStaging,
    isProduction,
    useMockServices: isDevelopment && process.env.USE_REAL_SERVICES !== 'true',
    debugMode: process.env.DEBUG_MODE === 'true'
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com',
    fromName: process.env.SENDGRID_FROM_NAME || 'BookedBarber',
    templateIds: {
      welcome: process.env.SENDGRID_TEMPLATE_WELCOME,
      campaign: process.env.SENDGRID_TEMPLATE_CAMPAIGN,
      reminder: process.env.SENDGRID_TEMPLATE_REMINDER
    },
    webhookSecret: process.env.SENDGRID_WEBHOOK_SECRET,
    ipPoolName: process.env.SENDGRID_IP_POOL,
    sandbox: isDevelopment || isStaging
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
    messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    statusCallbackUrl: process.env.TWILIO_STATUS_CALLBACK_URL,
    maxPricePerMessage: process.env.TWILIO_MAX_PRICE || '0.01',
    attemptLimit: parseInt(process.env.TWILIO_ATTEMPT_LIMIT || '3'),
    validityPeriod: parseInt(process.env.TWILIO_VALIDITY_PERIOD || '3600')
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: '2023-10-16',
    maxRetries: 3,
    timeout: 30000,
    telemetry: !isDevelopment
  },

  rateLimits: {
    email: {
      perUser: parseInt(process.env.EMAIL_RATE_LIMIT_USER || '100'),
      perShop: parseInt(process.env.EMAIL_RATE_LIMIT_SHOP || '1000'),
      perPlatform: parseInt(process.env.EMAIL_RATE_LIMIT_PLATFORM || '10000'),
      burstLimit: parseInt(process.env.EMAIL_BURST_LIMIT || '50')
    },
    sms: {
      perUser: parseInt(process.env.SMS_RATE_LIMIT_USER || '50'),
      perShop: parseInt(process.env.SMS_RATE_LIMIT_SHOP || '500'),
      perPlatform: parseInt(process.env.SMS_RATE_LIMIT_PLATFORM || '5000'),
      burstLimit: parseInt(process.env.SMS_BURST_LIMIT || '20')
    },
    api: {
      perUser: parseInt(process.env.API_RATE_LIMIT_USER || '60'),
      perIP: parseInt(process.env.API_RATE_LIMIT_IP || '100')
    }
  },

  spendingLimits: {
    defaultLimits: {
      individual: parseFloat(process.env.LIMIT_INDIVIDUAL || '100'),
      shop: parseFloat(process.env.LIMIT_SHOP || '1000'),
      enterprise: parseFloat(process.env.LIMIT_ENTERPRISE || '10000')
    },
    alertThresholds: {
      warning: parseFloat(process.env.ALERT_THRESHOLD_WARNING || '0.75'),
      critical: parseFloat(process.env.ALERT_THRESHOLD_CRITICAL || '0.90')
    },
    autoSuspend: process.env.AUTO_SUSPEND_ON_LIMIT === 'true'
  },

  monitoring: {
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_RATE || '0.1'),
      enabled: isProduction || isStaging
    },
    posthog: {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      apiHost: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      enabled: isProduction || isStaging
    },
    customMetrics: {
      trackCampaignPerformance: true,
      trackAPILatency: true,
      trackErrorRates: true,
      trackSpending: true
    }
  },

  security: {
    apiKeys: {
      required: isProduction,
      rotationDays: parseInt(process.env.API_KEY_ROTATION_DAYS || '90')
    },
    encryption: {
      algorithm: 'aes-256-gcm',
      keyDerivation: 'pbkdf2',
      iterations: parseInt(process.env.ENCRYPTION_ITERATIONS || '100000')
    },
    cors: {
      origin: process.env.CORS_ORIGIN || (isDevelopment ? '*' : 'https://bookedbarber.com'),
      credentials: true,
      maxAge: 86400
    },
    csp: {
      enabled: isProduction,
      reportUri: process.env.CSP_REPORT_URI
    }
  },

  retry: {
    maxAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3'),
    initialDelay: parseInt(process.env.RETRY_INITIAL_DELAY || '1000'),
    maxDelay: parseInt(process.env.RETRY_MAX_DELAY || '30000'),
    factor: parseFloat(process.env.RETRY_FACTOR || '2'),
    jitter: process.env.RETRY_JITTER === 'true'
  },

  queue: {
    redis: {
      url: process.env.REDIS_URL,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true
    },
    jobs: {
      emailCampaign: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      },
      smsCampaign: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 }
      },
      billing: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 }
      }
    }
  },

  features: {
    emailCampaigns: process.env.FEATURE_EMAIL_CAMPAIGNS !== 'false',
    smsCampaigns: process.env.FEATURE_SMS_CAMPAIGNS !== 'false',
    automatedCampaigns: process.env.FEATURE_AUTOMATED_CAMPAIGNS === 'true',
    advancedAnalytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
    whiteLabeling: process.env.FEATURE_WHITE_LABELING !== 'false',
    bulkOperations: process.env.FEATURE_BULK_OPERATIONS === 'true',
    apiAccess: process.env.FEATURE_API_ACCESS === 'true'
  },

  compliance: {
    gdpr: {
      enabled: process.env.GDPR_ENABLED !== 'false',
      dataRetentionDays: parseInt(process.env.GDPR_RETENTION_DAYS || '730'),
      requireConsent: true,
      allowDataExport: true,
      allowDataDeletion: true
    },
    canSpam: {
      enabled: process.env.CAN_SPAM_ENABLED !== 'false',
      includeUnsubscribeLink: true,
      includePhysicalAddress: true,
      honorOptOuts: true
    },
    tcpa: {
      enabled: process.env.TCPA_ENABLED !== 'false',
      requireOptIn: true,
      quietHours: {
        start: parseInt(process.env.TCPA_QUIET_START || '21'),
        end: parseInt(process.env.TCPA_QUIET_END || '8')
      }
    }
  }
};

function validateConfig() {
  const errors = [];

  if (isProduction) {
    if (!config.sendgrid.apiKey) errors.push('SENDGRID_API_KEY is required in production');
    if (!config.twilio.accountSid) errors.push('TWILIO_ACCOUNT_SID is required in production');
    if (!config.stripe.secretKey) errors.push('STRIPE_SECRET_KEY is required in production');
    if (!config.monitoring.sentry.dsn) errors.push('SENTRY_DSN is recommended for production');
  }

  if (isStaging) {
    if (!config.sendgrid.apiKey && !config.environment.useMockServices) {
      errors.push('SendGrid API key or mock services required for staging');
    }
  }

  return errors;
}

function getServiceStatus() {
  return {
    environment: process.env.NODE_ENV,
    useMockServices: config.environment.useMockServices,
    services: {
      sendgrid: {
        configured: !!config.sendgrid.apiKey,
        sandbox: config.sendgrid.sandbox,
        fromEmail: config.sendgrid.fromEmail
      },
      twilio: {
        configured: !!config.twilio.accountSid,
        phoneNumber: config.twilio.phoneNumber
      },
      stripe: {
        configured: !!config.stripe.secretKey,
        apiVersion: config.stripe.apiVersion
      }
    },
    features: config.features,
    monitoring: {
      sentry: config.monitoring.sentry.enabled,
      posthog: config.monitoring.posthog.enabled
    },
    rateLimits: {
      email: `${config.rateLimits.email.perShop}/hour`,
      sms: `${config.rateLimits.sms.perShop}/hour`,
      api: `${config.rateLimits.api.perUser}/minute`
    }
  };
}

module.exports = {
  config,
  validateConfig,
  getServiceStatus,
  isDevelopment,
  isStaging,
  isProduction
};