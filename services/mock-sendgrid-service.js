
class MockSendGridService {
  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY || 'mock-sendgrid-key'
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@bookedbarber.com'
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  async sendEmail(to, subject, content, options = {}) {
      to: Array.isArray(to) ? `${to.length} recipients` : to,
      subject,
      preview: content.substring(0, 100) + '...'
    })

    await new Promise(resolve => setTimeout(resolve, 500))

    return {
      success: true,
      messageId: `mock-msg-${Date.now()}`,
      accepted: Array.isArray(to) ? to : [to],
      rejected: [],
      pending: [],
      stats: {
        sent: Array.isArray(to) ? to.length : 1,
        delivered: Array.isArray(to) ? Math.floor(to.length * 0.98) : 1,
        opened: 0,
        clicked: 0
      }
    }
  }

  async sendCampaign(campaign, recipients) {
      campaign: campaign.name,
      recipients: recipients.length,
      type: campaign.type
    })

    const processingTime = Math.min(recipients.length * 10, 2000)
    await new Promise(resolve => setTimeout(resolve, processingTime))

    const deliveryRate = 0.97 // 97% delivery rate
    const openRate = 0.25 // 25% open rate
    const clickRate = 0.05 // 5% click rate

    return {
      success: true,
      campaignId: `mock-campaign-${Date.now()}`,
      stats: {
        recipients: recipients.length,
        sent: recipients.length,
        delivered: Math.floor(recipients.length * deliveryRate),
        bounced: Math.floor(recipients.length * (1 - deliveryRate)),
        opened: Math.floor(recipients.length * openRate),
        clicked: Math.floor(recipients.length * clickRate),
        unsubscribed: Math.floor(recipients.length * 0.002)
      },
      cost: {
        perEmail: 0.002,
        total: recipients.length * 0.002,
        platformFee: recipients.length * 0.002 * 0.15
      },
      timestamp: new Date().toISOString()
    }
  }

  async sendWhiteLabelCampaign(campaign, barbershop, recipients) {
      shop: barbershop.name,
      campaign: campaign.name,
      recipients: recipients.length
    })

    return {
      ...await this.sendCampaign(campaign, recipients),
      whiteLabel: {
        fromName: barbershop.name,
        fromEmail: barbershop.email || this.fromEmail,
        replyTo: barbershop.email
      }
    }
  }

  async createTemplate(name, subject, htmlContent, textContent) {
    
    return {
      success: true,
      templateId: `mock-template-${Date.now()}`,
      name,
      subject,
      versions: [{
        id: `v1-${Date.now()}`,
        active: true,
        htmlContent,
        textContent
      }]
    }
  }

  async createContactList(name, contacts) {
      name,
      contacts: contacts.length
    })

    return {
      success: true,
      listId: `mock-list-${Date.now()}`,
      name,
      contactCount: contacts.length,
      contacts: contacts.map(c => ({
        ...c,
        id: `contact-${Date.now()}-${Math.random()}`
      }))
    }
  }

  async getCampaignAnalytics(campaignId) {

    return {
      campaignId,
      metrics: {
        sent: 500,
        delivered: 485,
        bounced: 15,
        opened: 125,
        uniqueOpens: 98,
        clicked: 25,
        uniqueClicks: 18,
        unsubscribed: 2,
        spamReports: 0
      },
      engagement: {
        openRate: 25.0,
        clickRate: 5.0,
        clickToOpenRate: 20.0,
        bounceRate: 3.0,
        unsubscribeRate: 0.4
      },
      timeline: {
        sent: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastOpen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastClick: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
      }
    }
  }

  calculateBilling(recipientCount, accountType = 'shop') {
    const rates = {
      individual: 0.003, // $0.003 per email
      shop: 0.002,      // $0.002 per email
      enterprise: 0.001  // $0.001 per email
    }

    const rate = rates[accountType] || rates.shop
    const serviceCost = recipientCount * rate
    const platformFee = serviceCost * 0.15 // 15% platform fee
    const totalCost = serviceCost + platformFee

    return {
      recipientCount,
      ratePerEmail: rate,
      serviceCost: Math.round(serviceCost * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      accountType
    }
  }
}

const mockSendGridService = new MockSendGridService()

module.exports = {
  sendGridService: mockSendGridService,
  MockSendGridService
}