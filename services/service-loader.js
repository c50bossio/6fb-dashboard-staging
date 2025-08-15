
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
    const realSendGrid = require('./sendgrid-service')
    const realTwilio = require('./twilio-service')
    const realStripe = require('./stripe-service')
    
    sendGridService = realSendGrid.sendGridService
    twilioSMSService = realTwilio.twilioSMSService
    stripeService = realStripe.stripeService
  } catch (error) {
    console.warn('⚠️ Real services not found, falling back to mock services', error.message)
    
    const mockSendGrid = require('./mock-sendgrid-service')
    const mockTwilio = require('./mock-twilio-service')
    const mockStripe = require('./mock-stripe-service')
    
    sendGridService = mockSendGrid.sendGridService
    twilioSMSService = mockTwilio.twilioSMSService
    stripeService = mockStripe.stripeService
  }
}

module.exports = {
  sendGridService,
  twilioSMSService,
  stripeService,
  isDevelopment,
  useMockServices
}