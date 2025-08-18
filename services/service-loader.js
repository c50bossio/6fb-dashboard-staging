
/**
 * Production Service Loader
 * IMPORTANT: This loader ONLY uses real production services.
 * Mock services have been removed for production safety.
 */

const isDevelopment = process.env.NODE_ENV === 'development'

// Validate required environment variables
const requiredEnvVars = {
  stripe: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
  twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
  sendgrid: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL']
}

// Check for missing environment variables
const missingVars = []
for (const [service, vars] of Object.entries(requiredEnvVars)) {
  for (const varName of vars) {
    if (!process.env[varName] || process.env[varName].startsWith('your_')) {
      missingVars.push(`${service}: ${varName}`)
    }
  }
}

if (missingVars.length > 0) {
  console.error('⚠️ CRITICAL: Missing or invalid environment variables:')
  missingVars.forEach(v => console.error(`  - ${v}`))
  console.error('\n📝 Please configure these in your .env file for production use')
}

// Load production services
let sendGridService, twilioSMSService, stripeService

try {
  // Load SendGrid service
  try {
    sendGridService = require('./sendgrid-service-production')
    console.log('✅ SendGrid service loaded (production)')
  } catch (e) {
    console.error('❌ Failed to load SendGrid service:', e.message)
    sendGridService = null
  }
  
  // Load Twilio service
  try {
    const twilioModule = require('./twilio-service')
    twilioSMSService = twilioModule.twilioSMSService
    console.log('✅ Twilio service loaded (production)')
  } catch (e) {
    console.error('❌ Failed to load Twilio service:', e.message)
    twilioSMSService = null
  }
  
  // Load Stripe service
  try {
    const stripeModule = require('./stripe-service')
    stripeService = stripeModule.stripeService
    console.log('✅ Stripe service loaded (production)')
  } catch (e) {
    console.error('❌ Failed to load Stripe service:', e.message)
    stripeService = null
  }
  
} catch (error) {
  console.error('❌ Critical error loading production services:', error)
  
  // In production, we should fail loudly
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production services failed to load. Please check environment configuration.')
  }
}

// Warn if any services are not available
if (!sendGridService) {
  console.warn('⚠️ SendGrid service not available - email notifications will not work')
}
if (!twilioSMSService) {
  console.warn('⚠️ Twilio service not available - SMS notifications will not work')
}
if (!stripeService) {
  console.warn('⚠️ Stripe service not available - payments will not work')
}

module.exports = {
  sendGridService,
  twilioSMSService,
  stripeService,
  isDevelopment,
  useMockServices: false // Always false in production
}