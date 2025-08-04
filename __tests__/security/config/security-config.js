/**
 * Security Testing Configuration
 * Comprehensive security test configuration for automated scanning and testing
 */

export const SECURITY_CONFIG = {
  // Environment configuration
  environments: {
    development: {
      baseUrl: 'http://localhost:9999',
      apiUrl: 'http://localhost:8001'
    },
    staging: {
      baseUrl: 'https://staging.6fb-ai-agent.com',
      apiUrl: 'https://api-staging.6fb-ai-agent.com'
    },
    production: {
      baseUrl: 'https://6fb-ai-agent.com',
      apiUrl: 'https://api.6fb-ai-agent.com'
    }
  },

  // Authentication and session security
  authentication: {
    minPasswordLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordComplexityPatterns: [
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      /^.{12,}$/ // Minimum 12 characters
    ],
    sessionTimeout: 3600000, // 1 hour
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    jwtExpirationMax: 3600, // 1 hour max
    mfaEnabled: true,
    passwordHistoryCount: 12
  },

  // Input validation and sanitization
  inputValidation: {
    maxInputLength: 10000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
    forbiddenFileTypes: ['exe', 'bat', 'cmd', 'scr', 'pif', 'com', 'js', 'vbs', 'jar', 'php', 'asp', 'jsp'],
    sqlInjectionPatterns: [
      "'; DROP TABLE",
      "UNION SELECT",
      "' OR '1'='1",
      "admin'--",
      "'; DELETE FROM",
      "'; INSERT INTO",
      "'; UPDATE",
      "EXEC xp_",
      "sp_executesql",
      "xp_cmdshell",
      "'; SHUTDOWN",
      "WAITFOR DELAY",
      "CAST(chr(",
      "CHR(ASCII(",
      "BENCHMARK(",
      "SLEEP(",
      "pg_sleep(",
      "waitfor time"
    ],
    xssPatterns: [
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "<img src=x onerror=alert('xss')>",
      "';alert('xss');//",
      "<svg onload=alert('xss')>",
      "<iframe src=javascript:alert('xss')>",
      "<body onload=alert('xss')>",
      "<link rel=stylesheet href=javascript:alert('xss')>",
      "<meta http-equiv=refresh content=0;url=javascript:alert('xss')>",
      "<object data=javascript:alert('xss')>",
      "<embed src=javascript:alert('xss')>",
      "<applet code=javascript:alert('xss')>",
      "<form action=javascript:alert('xss')>",
      "<input type=image src=javascript:alert('xss')>",
      "<button onclick=alert('xss')>",
      "<%=alert('xss')%>",
      "${alert('xss')}",
      "{{alert('xss')}}",
      "<script>fetch('/admin').then(r=>r.text()).then(alert)</script>"
    ],
    ldapInjectionPatterns: [
      "*)(uid=*",
      "*)(|(uid=*",
      "*)(&(uid=*",
      "admin)(&(password=*",
      "admin))%00",
      "(cn=*)",
      "(objectClass=*)"
    ],
    nosqlInjectionPatterns: [
      "'; return '",
      "{$ne: null}",
      "{$gt: ''}",
      "{$regex: '.*'}",
      "{$where: 'this.password.match(/.*/)'}",
      "admin'; return 'a'=='a' && ''=='",
      "{$func: {$var: 'password'}}"
    ]
  },

  // API security testing
  apiSecurity: {
    rateLimiting: {
      requestsPerMinute: 60,
      burstLimit: 100,
      testRequestCount: 150,
      timeWindow: 60000 // 1 minute
    },
    cors: {
      allowedOrigins: ['http://localhost:9999', 'https://6fb-ai-agent.com'],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    },
    headers: {
      required: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': /.+/,
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      forbidden: ['Server', 'X-Powered-By', 'X-AspNet-Version', 'X-AspNetMvc-Version']
    }
  },

  // Vulnerability scanning configuration
  vulnerabilityScanning: {
    tools: {
      owasp_zap: {
        enabled: true,
        host: 'localhost',
        port: 8080,
        apiKey: process.env.ZAP_API_KEY || '',
        timeout: 300000, // 5 minutes
        scanPolicies: ['Light', 'Medium', 'High']
      },
      nuclei: {
        enabled: true,
        templatesPath: './nuclei-templates',
        severity: ['critical', 'high', 'medium'],
        tags: ['sqli', 'xss', 'rce', 'lfi', 'ssrf', 'cve']
      },
      semgrep: {
        enabled: true,
        ruleset: 'p/security-audit',
        configFile: '.semgrep.yml'
      },
      sonarqube: {
        enabled: false, // Enable for enterprise environments
        host: process.env.SONAR_HOST || '',
        token: process.env.SONAR_TOKEN || '',
        projectKey: '6fb-ai-agent-system'
      }
    }
  },

  // Penetration testing configuration
  penetrationTesting: {
    scope: {
      includePaths: ['/api/*', '/auth/*', '/dashboard/*', '/admin/*'],
      excludePaths: ['/static/*', '/assets/*', '/public/*'],
      testUsers: {
        admin: { email: 'admin@test.com', password: 'AdminPass123!', role: 'admin' },
        user: { email: 'user@test.com', password: 'UserPass123!', role: 'user' },
        guest: { email: 'guest@test.com', password: 'GuestPass123!', role: 'guest' }
      }
    },
    attacks: {
      bruteForce: {
        enabled: true,
        maxAttempts: 20,
        delayBetweenAttempts: 100
      },
      sessionFixation: {
        enabled: true
      },
      privilegeEscalation: {
        enabled: true
      },
      directObjectReference: {
        enabled: true
      },
      businessLogicFlaws: {
        enabled: true
      }
    }
  },

  // GDPR compliance testing
  gdprCompliance: {
    dataSubjects: {
      testPersons: [
        { name: 'John Doe', email: 'john.doe@test.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'jane.smith@test.com', phone: '+0987654321' }
      ]
    },
    rights: {
      rightToAccess: true,
      rightToRectification: true,
      rightToErasure: true,
      rightToPortability: true,
      rightToRestriction: true,
      rightToObject: true
    },
    lawfulBasis: [
      'consent',
      'contract',
      'legal_obligation',
      'vital_interests',
      'public_task',
      'legitimate_interests'
    ],
    dataCategories: [
      'personal_identifiers',
      'contact_information',
      'financial_data',
      'biometric_data',
      'location_data',
      'online_identifiers',
      'behavioral_data'
    ]
  },

  // Security monitoring and alerting
  monitoring: {
    alerts: {
      criticalThreshold: 1, // Alert immediately for critical vulnerabilities
      highThreshold: 5,     // Alert after 5 high severity issues
      mediumThreshold: 10   // Alert after 10 medium severity issues
    },
    reporting: {
      formats: ['json', 'html', 'pdf', 'sarif'],
      webhooks: [
        {
          name: 'security-team',
          url: process.env.SECURITY_WEBHOOK_URL || '',
          events: ['critical', 'high']
        }
      ],
      emailNotifications: {
        enabled: true,
        recipients: ['security@6fb-ai-agent.com'],
        severity: ['critical', 'high']
      }
    },
    continuousMonitoring: {
      scanInterval: 3600000, // 1 hour
      fullScanInterval: 86400000, // 24 hours
      metrics: {
        vulnerabilityCount: true,
        securityScore: true,
        complianceScore: true,
        responseTime: true
      }
    }
  },

  // Compliance frameworks
  compliance: {
    frameworks: {
      owasp_top10: {
        enabled: true,
        version: '2021',
        categories: [
          'A01_2021-Broken_Access_Control',
          'A02_2021-Cryptographic_Failures',
          'A03_2021-Injection',
          'A04_2021-Insecure_Design',
          'A05_2021-Security_Misconfiguration',
          'A06_2021-Vulnerable_and_Outdated_Components',
          'A07_2021-Identification_and_Authentication_Failures',
          'A08_2021-Software_and_Data_Integrity_Failures',
          'A09_2021-Security_Logging_and_Monitoring_Failures',
          'A10_2021-Server_Side_Request_Forgery'
        ]
      },
      nist_cybersecurity: {
        enabled: true,
        framework: 'NIST CSF 1.1',
        functions: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover']
      },
      iso27001: {
        enabled: false, // Enable for enterprise compliance
        controls: ['A.12.1', 'A.12.2', 'A.12.6', 'A.14.1', 'A.14.2']
      }
    }
  }
};

// Export individual configurations for modular usage
export const {
  environments,
  authentication,
  inputValidation,
  apiSecurity,
  vulnerabilityScanning,
  penetrationTesting,
  gdprCompliance,
  monitoring,
  compliance
} = SECURITY_CONFIG;

export default SECURITY_CONFIG;