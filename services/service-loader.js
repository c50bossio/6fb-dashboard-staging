
const isDevelopment = process.env.NODE_ENV === 'development'
const useMockServices = isDevelopment && process.env.USE_MOCK_SERVICES !== 'false'

// Service loader configuration

let sendGridService, twilioSMSService, stripeService

if (useMockServices) {
  const mockSendGrid = require('./mock-sendgrid-service')
  const mockTwilio = require('./mock-twilio-service')
  const mockStripe = require('./mock-stripe-service')
  
  sendGridService = mockSendGrid.sendGridService
  twilioSMSService = mockTwilio.twilioSMSService
  stripeService = mockStripe.stripeService
} else {
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
    
  } catch (error) {
    // Error loading production services - fall back to mock
    
    // Only fall back to mock in development
    if (isDevelopment) {
      const mockSendGrid = require('./mock-sendgrid-service')
      const mockTwilio = require('./mock-twilio-service')
      const mockStripe = require('./mock-stripe-service')
      
      sendGridService = mockSendGrid.sendGridService
      twilioSMSService = mockTwilio.twilioSMSService
      stripeService = mockStripe.stripeService
      
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