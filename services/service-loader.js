
const isDevelopment = process.env.NODE_ENV === 'development'
const useMockServices = isDevelopment && process.env.USE_MOCK_SERVICES !== 'false'

if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Service Loader:', {
    environment: process.env.NODE_ENV,
    useMockServices
  })
}

let sendGridService, twilioSMSService, stripeService

if (useMockServices) {
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Loading MOCK services for development')
  }
  
  const mockSendGrid = require('./mock-sendgrid-service')
  const mockTwilio = require('./mock-twilio-service')
  const mockStripe = require('./mock-stripe-service')
  
  sendGridService = mockSendGrid.sendGridService
  twilioSMSService = mockTwilio.twilioSMSService
  stripeService = mockStripe.stripeService
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log('📦 Loading REAL services for production')
  }
  
  try {
    // Use production services - they export singleton instances
    sendGridService = require('./sendgrid-service-production')
    
    // Check for Twilio and Stripe production services
    try {
      twilioSMSService = require('./twilio-service').twilioSMSService
    } catch (e) {
      twilioSMSService = require('./mock-twilio-service').twilioSMSService
    }
    
    try {
      stripeService = require('./stripe-service').stripeService
    } catch (e) {
      stripeService = require('./mock-stripe-service').stripeService
    }
    
    console.log('✅ Loaded production SendGrid service successfully')
  } catch (error) {
    console.warn('⚠️ Error loading production services:', error.message)
    
    // Only fall back to mock in development
    if (isDevelopment) {
      const mockSendGrid = require('./mock-sendgrid-service')
      const mockTwilio = require('./mock-twilio-service')
      const mockStripe = require('./mock-stripe-service')
      
      sendGridService = mockSendGrid.sendGridService
      twilioSMSService = mockTwilio.twilioSMSService
      stripeService = mockStripe.stripeService
      
      console.log('📦 Using mock services as fallback')
    } else {
      throw new Error('Production services not available')
    }
  }
}

module.exports = {
  sendGridService,
  twilioSMSService,
  stripeService,
  isDevelopment,
  useMockServices
}