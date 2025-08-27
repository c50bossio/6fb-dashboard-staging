/**
 * Trafft Integration Demonstration Script
 * Showcases all features of the comprehensive Trafft booking system integration
 */

import { createTrafftClient } from '../lib/trafft-api.js'
import {
  storeIntegrationCredentials,
  getIntegrationStatus,
  storeExternalAppointments,
  storeExternalCustomers,
  storeIntegrationAnalytics
} from '../services/trafft-database-service.js'
import { startScheduledSync, getScheduledSyncStatus } from '../services/trafft-scheduled-sync.js'
import { startMonitoring, getMonitoringStatus } from '../services/trafft-monitoring-service.js'

const DEMO_CONFIG = {
  barbershopId: 'demo-elite-cuts',
  barbershopName: 'Elite Cuts Barbershop',
  apiKey: process.env.TRAFFT_API_KEY || 'demo-key-12345',
  apiSecret: process.env.TRAFFT_API_SECRET || 'demo-secret-67890'
}

const DEMO_DATA = {
  appointments: [
    {
      id: 'appt-001',
      customerName: 'John Smith',
      customerEmail: 'john.smith@email.com',
      customerPhone: '+1-555-0101',
      employeeName: 'Mike Johnson',
      serviceName: 'Classic Haircut',
      dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      duration: 45,
      price: 35.00,
      status: 'confirmed'
    },
    {
      id: 'appt-002', 
      customerName: 'David Wilson',
      customerEmail: 'david.wilson@email.com',
      customerPhone: '+1-555-0102',
      employeeName: 'Sarah Davis',
      serviceName: 'Beard Trim & Style',
      dateTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours from now
      duration: 30,
      price: 25.00,
      status: 'confirmed'
    },
    {
      id: 'appt-003',
      customerName: 'Robert Brown',
      customerEmail: 'robert.brown@email.com', 
      customerPhone: '+1-555-0103',
      employeeName: 'Mike Johnson',
      serviceName: 'Premium Cut & Style',
      dateTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6 hours from now
      duration: 60,
      price: 65.00,
      status: 'confirmed'
    },
    {
      id: 'appt-004',
      customerName: 'Michael Garcia',
      customerEmail: 'michael.garcia@email.com',
      customerPhone: '+1-555-0104', 
      employeeName: 'Sarah Davis',
      serviceName: 'Hot Towel Shave',
      dateTime: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
      duration: 45,
      price: 40.00,
      status: 'confirmed'
    },
    {
      id: 'appt-005',
      customerName: 'James Martinez',
      customerEmail: 'james.martinez@email.com',
      customerPhone: '+1-555-0105',
      employeeName: 'Alex Thompson',
      serviceName: 'Full Service Package',
      dateTime: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10 hours from now
      duration: 90,
      price: 85.00,
      status: 'confirmed'
    }
  ],
  customers: [
    {
      id: 'cust-001',
      firstName: 'John',
      lastName: 'Smith', 
      email: 'john.smith@email.com',
      phone: '+1-555-0101',
      totalAppointments: 12,
      totalSpent: 420.00
    },
    {
      id: 'cust-002',
      firstName: 'David',
      lastName: 'Wilson',
      email: 'david.wilson@email.com',
      phone: '+1-555-0102',
      totalAppointments: 8,
      totalSpent: 200.00
    },
    {
      id: 'cust-003',
      firstName: 'Robert',
      lastName: 'Brown',
      email: 'robert.brown@email.com',
      phone: '+1-555-0103',
      totalAppointments: 15,
      totalSpent: 975.00
    },
    {
      id: 'cust-004',
      firstName: 'Michael',
      lastName: 'Garcia',
      email: 'michael.garcia@email.com',
      phone: '+1-555-0104',
      totalAppointments: 6,
      totalSpent: 240.00
    },
    {
      id: 'cust-005',
      firstName: 'James',
      lastName: 'Martinez',
      email: 'james.martinez@email.com',
      phone: '+1-555-0105',
      totalAppointments: 20,
      totalSpent: 1700.00
    }
  ],
  services: [
    {
      id: 'svc-001',
      name: 'Classic Haircut',
      description: 'Traditional men\'s haircut with styling',
      duration: 45,
      price: 35.00,
      category: 'Haircuts',
      isActive: true
    },
    {
      id: 'svc-002',
      name: 'Beard Trim & Style',
      description: 'Professional beard trimming and styling',
      duration: 30,
      price: 25.00,
      category: 'Grooming',
      isActive: true
    },
    {
      id: 'svc-003',
      name: 'Premium Cut & Style',
      description: 'Premium haircut with wash and detailed styling',
      duration: 60,
      price: 65.00,
      category: 'Premium Services',
      isActive: true
    },
    {
      id: 'svc-004',
      name: 'Hot Towel Shave',
      description: 'Traditional hot towel shave experience',
      duration: 45,
      price: 40.00,
      category: 'Grooming',
      isActive: true
    },
    {
      id: 'svc-005',
      name: 'Full Service Package',
      description: 'Complete grooming package: cut, shave, styling',
      duration: 90,
      price: 85.00,
      category: 'Premium Services',
      isActive: true
    }
  ],
  employees: [
    {
      id: 'emp-001',
      firstName: 'Mike',
      lastName: 'Johnson',
      email: 'mike@elitecuts.com',
      phone: '+1-555-0201',
      specialties: ['Classic Cuts', 'Styling', 'Beard Work']
    },
    {
      id: 'emp-002',
      firstName: 'Sarah',
      lastName: 'Davis',
      email: 'sarah@elitecuts.com',
      phone: '+1-555-0202',
      specialties: ['Precision Cuts', 'Beard Trimming', 'Hot Towel Shaves']
    },
    {
      id: 'emp-003',
      firstName: 'Alex',
      lastName: 'Thompson',
      email: 'alex@elitecuts.com',
      phone: '+1-555-0203',
      specialties: ['Premium Services', 'Full Service Packages', 'Hair Treatments']
    }
  ]
}

class TrafftIntegrationDemo {
  constructor() {
    this.integrationId = null
    this.client = null
  }

  /**
   * Run complete integration demonstration
   */
  async runDemo() {
    
    )

    .toLocaleString()}`)
    )

    try {
      await this.step1_SetupIntegration()
      await this.step2_SyncBusinessData()
      await this.step3_GenerateBusinessAnalytics()
      await this.step4_DemonstrateAIInsights()
      await this.step5_ShowWebhookProcessing()
      await this.step6_StartAutomatedServices()
      await this.step7_DisplayDashboardData()
      await this.step8_ShowMonitoringHealth()
      
      await this.showFinalSummary()

    } catch (error) {
      console.error('❌ Demo failed:', error)
      throw error
    }
  }

  /**
   * Step 1: Setup Trafft Integration
   */
  async step1_SetupIntegration() {
    
    )

    this.integrationId = await storeIntegrationCredentials(DEMO_CONFIG.barbershopId, {
      apiKey: DEMO_CONFIG.apiKey,
      apiSecret: DEMO_CONFIG.apiSecret
    })

    this.client = createTrafftClient(DEMO_CONFIG.apiKey, DEMO_CONFIG.apiSecret)

    const status = await getIntegrationStatus(DEMO_CONFIG.barbershopId)
    
    .toLocaleString()}`)
    
    await this.wait(1)
  }

  /**
   * Step 2: Sync Business Data
   */
  async step2_SyncBusinessData() {
    
    )

    const appointmentResult = await storeExternalAppointments(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.appointments
    )

    const customerResult = await storeExternalCustomers(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.customers
    )

    const serviceResult = await storeExternalServices(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.services
    )

    const employeeResult = await storeExternalEmployees(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.employees
    )

    await this.wait(1)
  }

  /**
   * Step 3: Generate Business Analytics
   */
  async step3_GenerateBusinessAnalytics() {
    
    )

    const analytics = this.client.calculateBusinessMetrics(
      DEMO_DATA.appointments,
      DEMO_DATA.customers,
      DEMO_DATA.services,
      DEMO_DATA.employees,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      new Date().toISOString().split('T')[0] // Today
    )

     || '0.00'}`)
     || '0.00'}`)
     || '0.00'}`)

     || '0.0'}%`)

     || '100.0'}%`)
     || '0'} minutes`)

    if (analytics.services.popular && analytics.services.popular.length > 0) {
      analytics.services.popular.slice(0, 3).forEach((service, index) => {
         || '0.00'} revenue`)
      })
    }

    await storeIntegrationAnalytics(this.integrationId, DEMO_CONFIG.barbershopId, analytics)

    await this.wait(2)
  }

  /**
   * Step 4: Demonstrate AI Insights
   */
  async step4_DemonstrateAIInsights() {
    
    )

    const analytics = this.client.calculateBusinessMetrics(
      DEMO_DATA.appointments,
      DEMO_DATA.customers,
      DEMO_DATA.services,
      DEMO_DATA.employees,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    )

    const growthPotential = analytics.businessInsights?.revenueGrowthPotential
    if (growthPotential) {
      
       || '0.00'}`)
      if (growthPotential.recommendations?.length > 0) {
        
        growthPotential.recommendations.forEach((rec, index) => {
          
        })
      }
    }

    const capacity = analytics.businessInsights?.capacityUtilization
    if (capacity) {

    }

    const pricing = analytics.businessInsights?.pricingOptimization
    if (pricing && pricing.length > 0) {
      pricing.slice(0, 3).forEach((service, index) => {
         || '0.00'} → ${service.pricingOpportunity || 'maintain'}`)
      })
    }

    if (analytics.scheduling?.peakHours?.length > 0) {
      analytics.scheduling.peakHours.forEach((peak, index) => {
        const hour = peak.hour
        const time = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`
        
      })
    }

    await this.wait(2)
  }

  /**
   * Step 5: Show Webhook Processing
   */
  async step5_ShowWebhookProcessing() {
    
    )

    const newAppointment = {
      id: 'appt-webhook-001',
      customerName: 'New Customer via Webhook',
      customerEmail: 'webhook@example.com',
      customerPhone: '+1-555-0999',
      employeeName: 'Mike Johnson',
      serviceName: 'Classic Haircut',
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 45,
      price: 35.00,
      status: 'confirmed'
    }

    .toLocaleString()}`)

    await storeExternalAppointments(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      [newAppointment]
    )

    await this.wait(1)
  }

  /**
   * Step 6: Start Automated Services
   */
  async step6_StartAutomatedServices() {
    
    )

    await startScheduledSync()
    const syncStatus = await getScheduledSyncStatus()
    
    }`)

    await startMonitoring()
    const monitoringStatus = await getMonitoringStatus() 

    ')

    await this.wait(1)
  }

  /**
   * Step 7: Display Dashboard Data
   */
  async step7_DisplayDashboardData() {
    
    )

    const status = await getIntegrationStatus(DEMO_CONFIG.barbershopId)

    }`)
    .toLocaleDateString()}`)
    .toLocaleString() : 'Just completed'}`)

    await this.wait(2)
  }

  /**
   * Step 8: Show Monitoring Health
   */
  async step8_ShowMonitoringHealth() {
    
    )

    const monitoringStatus = await getMonitoringStatus()

    } ${monitoringStatus.metrics.healthStatus || 'Healthy'}`)
    
    : ${monitoringStatus.metrics.successfulSyncs24h || 0}`)
    : ${monitoringStatus.metrics.failedSyncs24h || 0}`)

     || '0.0'}s`)

    await this.wait(1)
  }

  /**
   * Show final summary
   */
  async showFinalSummary() {
    )
    
    )

    )
    .toLocaleString()}`)
    
    )
  }

  /**
   * Helper method to get health status emoji
   */
  getHealthEmoji(status) {
    switch (status) {
      case 'healthy': return '🟢'
      case 'degraded': return '🟡'
      case 'unhealthy': return '🔴'
      default: return '⚪'
    }
  }

  /**
   * Helper method to add dramatic pauses
   */
  async wait(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000))
  }
}

export { TrafftIntegrationDemo, DEMO_CONFIG, DEMO_DATA }

if (import.meta.url === `file://${process.argv[1]}`) {
  const demo = new TrafftIntegrationDemo()
  
  demo.runDemo()
    .then(() => {
      
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error)
      process.exit(1)
    })
}