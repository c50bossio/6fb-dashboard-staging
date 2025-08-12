// Service Loader - Loads mock services in development, real services in production
// This ensures the application works without external API dependencies during development

const isDevelopment = process.env.NODE_ENV === 'development'
const useMockServices = isDevelopment && process.env.USE_MOCK_SERVICES !== 'false'

console.log('🔧 Service Loader:', {
  environment: process.env.NODE_ENV,
  useMockServices
})

// Load appropriate services based on environment
let sendGridService, twilioSMSService, stripeService

if (useMockServices) {
  // Load mock services for development
  console.log('📦 Loading MOCK services for development')
  
  const mockSendGrid = require('./mock-sendgrid-service')
  const mockTwilio = require('./mock-twilio-service')
  const mockStripe = require('./mock-stripe-service')
  
  sendGridService = mockSendGrid.sendGridService
  twilioSMSService = mockTwilio.twilioSMSService
  stripeService = mockStripe.stripeService
} else {
  // Load real services for production
  console.log('📦 Loading REAL services for production')
  
  try {
    // Try to load real services if they exist
    const realSendGrid = require('./sendgrid-service')
    const realTwilio = require('./twilio-service')
    const realStripe = require('./stripe-service')
    
    sendGridService = realSendGrid.sendGridService
    twilioSMSService = realTwilio.twilioSMSService
    stripeService = realStripe.stripeService
  } catch (error) {
    console.warn('⚠️ Real services not found, falling back to mock services', error.message)
    
    // Fallback to mock services if real ones don't exist
    const mockSendGrid = require('./mock-sendgrid-service')
    const mockTwilio = require('./mock-twilio-service')
    const mockStripe = require('./mock-stripe-service')
    
    sendGridService = mockSendGrid.sendGridService
    twilioSMSService = mockTwilio.twilioSMSService
    stripeService = mockStripe.stripeService
  }
}

// Export the loaded services
module.exports = {
  sendGridService,
  twilioSMSService,
  stripeService,
  isDevelopment,
  useMockServices
}