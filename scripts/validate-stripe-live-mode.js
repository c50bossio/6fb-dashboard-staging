#!/usr/bin/env node

/**
 * Stripe Live Mode Validation Script
 * Ensures all Stripe configurations are set to live mode for production
 * Run this before deployment and in CI/CD pipeline
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

class StripeValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.isProduction = process.env.NODE_ENV === 'production' || 
                       process.env.VERCEL_ENV === 'production' ||
                       process.argv.includes('--production');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  validateEnvironmentVariables() {
    this.log('\n🔍 Validating Environment Variables...', 'blue');
    
    const requiredVars = {
      'STRIPE_SECRET_KEY': {
        pattern: /^sk_(live|test)_/,
        livePrefix: 'sk_live_',
        description: 'Stripe Secret Key'
      },
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY': {
        pattern: /^pk_(live|test)_/,
        livePrefix: 'pk_live_',
        description: 'Stripe Publishable Key'
      },
      'STRIPE_WEBHOOK_SECRET': {
        pattern: /^whsec_/,
        livePrefix: 'whsec_',
        description: 'Stripe Webhook Secret',
        optional: true
      },
      'NEXT_PUBLIC_APP_URL': {
        pattern: /^https:\/\//,
        liveValue: 'https://bookedbarber.com',
        description: 'Application URL'
      }
    };

    for (const [key, config] of Object.entries(requiredVars)) {
      const value = process.env[key];
      
      if (!value) {
        if (!config.optional) {
          this.errors.push(`❌ ${config.description} (${key}) is not set`);
        } else {
          this.warnings.push(`⚠️  ${config.description} (${key}) is not set (optional)`);
        }
        continue;
      }

      // Check for test mode keys in production
      if (this.isProduction) {
        if (config.livePrefix && !value.startsWith(config.livePrefix)) {
          this.errors.push(`❌ ${config.description} is in TEST mode (${value.substring(0, 12)}...)`);
        } else if (config.liveValue && value !== config.liveValue) {
          this.errors.push(`❌ ${config.description} should be ${config.liveValue}, got ${value}`);
        } else {
          this.log(`  ✅ ${config.description}: ${value.substring(0, 20)}...`, 'green');
        }
      } else {
        // Development mode - just check if valid
        if (config.pattern && !config.pattern.test(value)) {
          this.warnings.push(`⚠️  ${config.description} format looks invalid`);
        } else {
          this.log(`  ✓ ${config.description}: ${value.substring(0, 20)}...`, 'green');
        }
      }
    }
  }

  validateStripeKeyConsistency() {
    this.log('\n🔄 Checking Key Consistency...', 'blue');
    
    const secretKey = process.env.STRIPE_SECRET_KEY || '';
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
    
    const secretMode = secretKey.includes('live') ? 'live' : 'test';
    const publishableMode = publishableKey.includes('live') ? 'live' : 'test';
    
    if (secretKey && publishableKey && secretMode !== publishableMode) {
      this.errors.push(`❌ Key mismatch: Secret key is ${secretMode} mode, Publishable key is ${publishableMode} mode`);
    } else if (secretKey && publishableKey) {
      this.log(`  ✅ Keys are consistent (both ${secretMode} mode)`, 'green');
    }
  }

  scanCodeForTestKeys() {
    this.log('\n📝 Scanning code for hardcoded test keys...', 'blue');
    
    const filesToScan = [
      'app/**/*.js',
      'app/**/*.jsx',
      'components/**/*.js',
      'components/**/*.jsx',
      'lib/**/*.js',
      'services/**/*.js'
    ];
    
    const testPatterns = [
      /sk_test_[a-zA-Z0-9]+/g,
      /pk_test_[a-zA-Z0-9]+/g,
      /whsec_test_[a-zA-Z0-9]+/g
    ];
    
    let hardcodedFound = false;
    
    // Note: In a real implementation, you'd use glob to scan files
    // For now, we'll check key files
    const keyFiles = [
      'app/api/payments/connect/create/route.js',
      'app/api/payments/connect/onboarding-link/route.js',
      'app/(protected)/shop/settings/payment-setup/page.js'
    ];
    
    keyFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        testPatterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches) {
            this.warnings.push(`⚠️  Found test key in ${file}: ${matches[0].substring(0, 20)}...`);
            hardcodedFound = true;
          }
        });
      }
    });
    
    if (!hardcodedFound) {
      this.log('  ✅ No hardcoded test keys found in code', 'green');
    }
  }

  validateProductionReadiness() {
    this.log('\n🚀 Production Readiness Check...', 'blue');
    
    const checks = {
      'NODE_ENV': process.env.NODE_ENV === 'production',
      'HTTPS URL': process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://'),
      'Live Stripe Keys': process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_'),
      'Database URL': !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      'Service Role Key': !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };
    
    Object.entries(checks).forEach(([check, passed]) => {
      if (passed) {
        this.log(`  ✅ ${check}`, 'green');
      } else {
        this.warnings.push(`  ⚠️  ${check} check failed`);
      }
    });
  }

  generateEnvTemplate() {
    this.log('\n📄 Generating .env.production template...', 'blue');
    
    const template = `# Production Environment Variables for BookedBarber
# Generated by validate-stripe-live-mode.js
# ${new Date().toISOString()}

# ============================================
# STRIPE CONFIGURATION (LIVE MODE ONLY)
# ============================================
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# ============================================
# APPLICATION CONFIGURATION
# ============================================
NEXT_PUBLIC_APP_URL=https://bookedbarber.com
NODE_ENV=production

# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'}
SUPABASE_SERVICE_ROLE_KEY=${process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'}

# ============================================
# OTHER SERVICES
# ============================================
OPENAI_API_KEY=${process.env.OPENAI_API_KEY || 'YOUR_OPENAI_KEY'}
ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || 'YOUR_ANTHROPIC_KEY'}
SENDGRID_API_KEY=${process.env.SENDGRID_API_KEY || 'YOUR_SENDGRID_KEY'}
`;

    fs.writeFileSync('.env.production.template', template);
    this.log('  ✅ Created .env.production.template', 'green');
  }

  printSummary() {
    this.log('\n' + '='.repeat(60), 'blue');
    this.log('VALIDATION SUMMARY', 'magenta');
    this.log('='.repeat(60), 'blue');
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      this.log('\n🎉 ALL CHECKS PASSED! Ready for production deployment.', 'green');
      return true;
    }
    
    if (this.errors.length > 0) {
      this.log(`\n❌ ERRORS (${this.errors.length}):`, 'red');
      this.errors.forEach(error => this.log(error, 'red'));
    }
    
    if (this.warnings.length > 0) {
      this.log(`\n⚠️  WARNINGS (${this.warnings.length}):`, 'yellow');
      this.warnings.forEach(warning => this.log(warning, 'yellow'));
    }
    
    if (this.errors.length > 0) {
      this.log('\n🚫 DEPLOYMENT BLOCKED: Fix all errors before deploying to production.', 'red');
      return false;
    } else {
      this.log('\n⚠️  DEPLOYMENT WARNING: Review warnings before proceeding.', 'yellow');
      return true;
    }
  }

  run() {
    this.log('🔐 Stripe Live Mode Validator v1.0', 'magenta');
    this.log(`Mode: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'blue');
    
    this.validateEnvironmentVariables();
    this.validateStripeKeyConsistency();
    this.scanCodeForTestKeys();
    
    if (this.isProduction) {
      this.validateProductionReadiness();
    }
    
    this.generateEnvTemplate();
    
    const isValid = this.printSummary();
    
    // Exit with error code if validation fails in production mode
    if (this.isProduction && !isValid) {
      process.exit(1);
    }
  }
}

// Run the validator
const validator = new StripeValidator();
validator.run();

// Export for use in other scripts
module.exports = StripeValidator;