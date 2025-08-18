
class MockTwilioService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || 'mock-twilio-sid'
    this.authToken = process.env.TWILIO_AUTH_TOKEN || 'mock-twilio-token'
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  async sendSMS(to, message, options = {}) {
      to: Array.isArray(to) ? `${to.length} recipients` : to,
      messageLength: message.length,
      segments: Math.ceil(message.length / 160)
    })

    await new Promise(resolve => setTimeout(resolve, 300))

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      to: Array.isArray(to) ? to : [to],
      from: this.phoneNumber,
      body: message,
      status: 'sent',
      segments: Math.ceil(message.length / 160),
      price: Math.ceil(message.length / 160) * 0.0075,
      priceUnit: 'USD'
    }
  }

  async sendSMSCampaign(campaign, recipients) {
      campaign: campaign.name,
      recipients: recipients.length,
      message: campaign.message.substring(0, 50) + '...'
    })

    const processingTime = Math.min(recipients.length * 20, 3000)
    await new Promise(resolve => setTimeout(resolve, processingTime))

    const deliveryRate = 0.99 // 99% delivery rate for SMS
    const segments = Math.ceil(campaign.message.length / 160)

    return {
      success: true,
      campaignId: `mock-sms-campaign-${Date.now()}`,
      stats: {
        recipients: recipients.length,
        sent: recipients.length,
        delivered: Math.floor(recipients.length * deliveryRate),
        failed: Math.floor(recipients.length * (1 - deliveryRate)),
        segments: segments,
        totalSegments: recipients.length * segments
      },
      cost: {
        perSMS: 0.0075 * segments,
        total: recipients.length * 0.0075 * segments,
        platformFee: recipients.length * 0.0075 * segments * 0.15
      },
      timestamp: new Date().toISOString()
    }
  }

  async sendWhiteLabelSMSCampaign(campaign, barbershop, recipients) {
      shop: barbershop.name,
      campaign: campaign.name,
      recipients: recipients.length
    })

    const brandedMessage = `${barbershop.name}: ${campaign.message}`

    return {
      ...await this.sendSMSCampaign({ ...campaign, message: brandedMessage }, recipients),
      whiteLabel: {
        shopName: barbershop.name,
        shopPhone: barbershop.phone || this.phoneNumber
      }
    }
  }

  async validatePhoneNumber(phoneNumber) {

    const cleaned = phoneNumber.replace(/\D/g, '')
    const isValid = cleaned.length === 10 || cleaned.length === 11

    return {
      valid: isValid,
      phoneNumber: cleaned,
      formatted: isValid ? `+1${cleaned.slice(-10)}` : null,
      carrier: isValid ? 'Mock Carrier' : null,
      type: isValid ? 'mobile' : null
    }
  }

  async addOptOut(phoneNumber) {
    
    return {
      success: true,
      phoneNumber,
      optedOutAt: new Date().toISOString()
    }
  }

  async removeOptOut(phoneNumber) {
    
    return {
      success: true,
      phoneNumber,
      optedInAt: new Date().toISOString()
    }
  }

  async checkOptOut(phoneNumber) {
    
    const isOptedOut = Math.random() < 0.05 // 5% opted out

    return {
      phoneNumber,
      optedOut: isOptedOut,
      optedOutAt: isOptedOut ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() : null
    }
  }

  async getSMSAnalytics(campaignId) {

    return {
      campaignId,
      metrics: {
        sent: 250,
        delivered: 248,
        failed: 2,
        undelivered: 0,
        segments: 1.2, // Average segments per message
        totalSegments: 300
      },
      engagement: {
        deliveryRate: 99.2,
        responseRate: 8.5, // Estimated response rate
        optOutRate: 0.4
      },
      timeline: {
        sent: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        lastDelivered: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString()
      }
    }
  }

  calculateSMSBilling(recipientCount, messageLength = 160, accountType = 'shop') {
    const segments = Math.ceil(messageLength / 160)
    
    const rates = {
      individual: 0.01,   // $0.01 per segment
      shop: 0.0075,      // $0.0075 per segment
      enterprise: 0.005   // $0.005 per segment
    }

    const rate = rates[accountType] || rates.shop
    const serviceCost = recipientCount * segments * rate
    const platformFee = serviceCost * 0.15 // 15% platform fee
    const totalCost = serviceCost + platformFee

    return {
      recipientCount,
      segments,
      totalSegments: recipientCount * segments,
      ratePerSegment: rate,
      serviceCost: Math.round(serviceCost * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      accountType
    }
  }

  async scheduleSMS(to, message, sendAt) {
      to: Array.isArray(to) ? `${to.length} recipients` : to,
      sendAt
    })

    return {
      success: true,
      scheduleId: `mock-schedule-${Date.now()}`,
      to,
      message,
      sendAt,
      status: 'scheduled'
    }
  }
}

const mockTwilioService = new MockTwilioService()

module.exports = {
  twilioSMSService: mockTwilioService,
  MockTwilioService
}