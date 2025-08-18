import { NextResponse } from 'next/server'

/**
 * GET /api/integrations/status
 * Get the status of all integrations for the integrations hub
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const barbershopId = searchParams.get('barbershop_id') || 'demo-shop-001'
    
    // Mock integration status data for now
    // In a real implementation, this would check actual service connections
    const integrationStatus = {
      marketing: {
        google_analytics: {
          name: 'Google Analytics',
          status: 'disconnected',
          lastSync: null,
          config: {
            tracking_id: null,
            goals_configured: 0
          }
        },
        google_tag_manager: {
          name: 'Google Tag Manager',
          status: 'disconnected',
          lastSync: null,
          config: {
            container_id: null,
            tags_active: 0
          }
        },
        meta_pixel: {
          name: 'Meta Pixel',
          status: 'disconnected',
          lastSync: null,
          config: {
            pixel_id: null,
            events_configured: 0
          }
        }
      },
      business_operations: {
        google_my_business: {
          name: 'Google My Business',
          status: 'connected',
          lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          config: {
            locations_connected: 1,
            reviews_synced: true,
            ai_attribution_enabled: true
          }
        },
        cin7_inventory: {
          name: 'Cin7 Inventory',
          status: 'coming-soon',
          lastSync: null,
          config: null
        },
        quickbooks: {
          name: 'QuickBooks',
          status: 'coming-soon',
          lastSync: null,
          config: null
        }
      },
      communication: {
        stripe: {
          name: 'Stripe',
          status: 'connected',
          lastSync: 'live',
          config: {
            account_id: 'acct_xxx',
            webhooks_configured: true,
            payment_methods: ['card', 'bank_transfer']
          }
        },
        twilio_sms: {
          name: 'Twilio SMS',
          status: 'connected',
          lastSync: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
          config: {
            phone_number: '+1555XXXX',
            messages_sent_today: 12
          }
        },
        sendgrid: {
          name: 'SendGrid',
          status: 'connected',
          lastSync: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          config: {
            verified_sender: true,
            emails_sent_today: 45
          }
        }
      }
    }

    // Calculate health summary
    const allIntegrations = [
      ...Object.values(integrationStatus.marketing),
      ...Object.values(integrationStatus.business_operations),
      ...Object.values(integrationStatus.communication)
    ]

    const healthSummary = {
      total: allIntegrations.length,
      connected: allIntegrations.filter(i => i.status === 'connected').length,
      disconnected: allIntegrations.filter(i => i.status === 'disconnected').length,
      coming_soon: allIntegrations.filter(i => i.status === 'coming-soon').length,
      errors: allIntegrations.filter(i => i.status === 'error').length,
      warnings: allIntegrations.filter(i => i.status === 'warning').length
    }

    return NextResponse.json({
      success: true,
      data: {
        barbershop_id: barbershopId,
        integrations: integrationStatus,
        health_summary: healthSummary,
        last_updated: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching integration status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch integration status'
    }, { status: 500 })
  }
}