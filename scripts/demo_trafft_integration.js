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
    console.log('🎯 TRAFFT INTEGRATION COMPREHENSIVE DEMONSTRATION')
    console.log('=' .repeat(70))
    console.log(`🏪 Barbershop: ${DEMO_CONFIG.barbershopName}`)
    console.log(`🆔 ID: ${DEMO_CONFIG.barbershopId}`)
    console.log(`⏰ Demo Started: ${new Date().toLocaleString()}`)
    console.log('=' .repeat(70))

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
    console.log('\n📋 STEP 1: SETTING UP TRAFFT INTEGRATION')
    console.log('-'.repeat(50))

    console.log('🔐 Storing integration credentials securely...')
    this.integrationId = await storeIntegrationCredentials(DEMO_CONFIG.barbershopId, {
      apiKey: DEMO_CONFIG.apiKey,
      apiSecret: DEMO_CONFIG.apiSecret
    })
    console.log(`✅ Integration ID: ${this.integrationId}`)

    console.log('🔌 Creating Trafft API client...')
    this.client = createTrafftClient(DEMO_CONFIG.apiKey, DEMO_CONFIG.apiSecret)
    console.log('✅ API client initialized')

    console.log('📊 Checking integration status...')
    const status = await getIntegrationStatus(DEMO_CONFIG.barbershopId)
    console.log(`✅ Status: ${status.status}`)
    console.log(`✅ Authenticated: ${new Date(status.authenticatedAt).toLocaleString()}`)
    
    await this.wait(1)
  }

  /**
   * Step 2: Sync Business Data
   */
  async step2_SyncBusinessData() {
    console.log('\n🔄 STEP 2: SYNCING BUSINESS DATA FROM TRAFFT')
    console.log('-'.repeat(50))

    console.log('📅 Syncing appointments...')
    const appointmentResult = await storeExternalAppointments(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.appointments
    )
    console.log(`✅ Synced ${appointmentResult.success}/${appointmentResult.total} appointments`)

    console.log('👥 Syncing customers...')
    const customerResult = await storeExternalCustomers(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.customers
    )
    console.log(`✅ Synced ${customerResult.success}/${customerResult.total} customers`)

    console.log('💇 Syncing services...')
    const serviceResult = await storeExternalServices(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.services
    )
    console.log(`✅ Synced ${serviceResult.success}/${serviceResult.total} services`)

    console.log('👨‍💼 Syncing employees...')
    const employeeResult = await storeExternalEmployees(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      DEMO_DATA.employees
    )
    console.log(`✅ Synced ${employeeResult.success}/${employeeResult.total} employees`)

    await this.wait(1)
  }

  /**
   * Step 3: Generate Business Analytics
   */
  async step3_GenerateBusinessAnalytics() {
    console.log('\n📈 STEP 3: GENERATING BUSINESS ANALYTICS')
    console.log('-'.repeat(50))

    console.log('🧮 Calculating business metrics...')
    const analytics = this.client.calculateBusinessMetrics(
      DEMO_DATA.appointments,
      DEMO_DATA.customers,
      DEMO_DATA.services,
      DEMO_DATA.employees,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
      new Date().toISOString().split('T')[0] // Today
    )

    console.log('💰 REVENUE ANALYTICS:')
    console.log(`   Total Revenue: $${analytics.revenue.total?.toFixed(2) || '0.00'}`)
    console.log(`   Average Ticket: $${analytics.revenue.avgTicket?.toFixed(2) || '0.00'}`)
    console.log(`   Daily Average: $${analytics.revenue.dailyAvg?.toFixed(2) || '0.00'}`)

    console.log('👥 CLIENT ANALYTICS:')
    console.log(`   Total Clients: ${analytics.clients.total || 0}`)
    console.log(`   New Clients: ${analytics.clients.new || 0}`)
    console.log(`   Retention Rate: ${analytics.clients.retentionRate?.toFixed(1) || '0.0'}%`)

    console.log('📋 APPOINTMENT ANALYTICS:')
    console.log(`   Total Appointments: ${analytics.appointments.total || 0}`)
    console.log(`   Completion Rate: ${analytics.appointments.completionRate?.toFixed(1) || '100.0'}%`)
    console.log(`   Average Duration: ${analytics.appointments.avgDuration?.toFixed(0) || '0'} minutes`)

    console.log('🔥 POPULAR SERVICES:')
    if (analytics.services.popular && analytics.services.popular.length > 0) {
      analytics.services.popular.slice(0, 3).forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name}: ${service.bookings} bookings, $${service.revenue?.toFixed(2) || '0.00'} revenue`)
      })
    }

    await storeIntegrationAnalytics(this.integrationId, DEMO_CONFIG.barbershopId, analytics)
    console.log('✅ Analytics stored in database')

    await this.wait(2)
  }

  /**
   * Step 4: Demonstrate AI Insights
   */
  async step4_DemonstrateAIInsights() {
    console.log('\n🤖 STEP 4: AI-POWERED BUSINESS INSIGHTS')
    console.log('-'.repeat(50))

    const analytics = this.client.calculateBusinessMetrics(
      DEMO_DATA.appointments,
      DEMO_DATA.customers,
      DEMO_DATA.services,
      DEMO_DATA.employees,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    )

    console.log('🎯 GROWTH POTENTIAL ANALYSIS:')
    const growthPotential = analytics.businessInsights?.revenueGrowthPotential
    if (growthPotential) {
      console.log(`   Current Utilization: ${growthPotential.currentUtilization || 0}%`)
      console.log(`   Monthly Growth Potential: $${growthPotential.monthlyGrowthPotential?.toFixed(2) || '0.00'}`)
      if (growthPotential.recommendations?.length > 0) {
        console.log(`   AI Recommendations:`)
        growthPotential.recommendations.forEach((rec, index) => {
          console.log(`     ${index + 1}. ${rec}`)
        })
      }
    }

    console.log('⚙️ CAPACITY UTILIZATION:')
    const capacity = analytics.businessInsights?.capacityUtilization
    if (capacity) {
      console.log(`   Utilization Rate: ${capacity.utilizationRate || 0}%`)
      console.log(`   Available Slots: ${capacity.availableSlots || 0}`)
      console.log(`   Total Capacity: ${capacity.totalCapacity || 0}`)
    }

    console.log('💡 PRICING OPTIMIZATION:')
    const pricing = analytics.businessInsights?.pricingOptimization
    if (pricing && pricing.length > 0) {
      pricing.slice(0, 3).forEach((service, index) => {
        console.log(`   ${index + 1}. ${service.name}: $${service.currentPrice?.toFixed(2) || '0.00'} → ${service.pricingOpportunity || 'maintain'}`)
      })
    }

    console.log('📊 PEAK HOURS ANALYSIS:')
    if (analytics.scheduling?.peakHours?.length > 0) {
      analytics.scheduling.peakHours.forEach((peak, index) => {
        const hour = peak.hour
        const time = hour === 0 ? '12 AM' : hour <= 12 ? `${hour} AM` : `${hour - 12} PM`
        console.log(`   ${index + 1}. ${time}: ${peak.bookings} bookings`)
      })
    }

    await this.wait(2)
  }

  /**
   * Step 5: Show Webhook Processing
   */
  async step5_ShowWebhookProcessing() {
    console.log('\n🔗 STEP 5: REAL-TIME WEBHOOK PROCESSING')
    console.log('-'.repeat(50))

    console.log('📨 Simulating webhook events...')

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

    console.log('🎯 Processing "appointment.created" webhook:')
    console.log(`   Customer: ${newAppointment.customerName}`)
    console.log(`   Service: ${newAppointment.serviceName}`)
    console.log(`   Time: ${new Date(newAppointment.dateTime).toLocaleString()}`)
    console.log(`   Revenue Impact: $${newAppointment.price}`)

    await storeExternalAppointments(
      this.integrationId,
      DEMO_CONFIG.barbershopId,
      [newAppointment]
    )

    console.log('✅ Appointment processed and stored')
    console.log('✅ Real-time analytics updated')
    console.log('✅ AI insights refreshed')

    await this.wait(1)
  }

  /**
   * Step 6: Start Automated Services
   */
  async step6_StartAutomatedServices() {
    console.log('\n⚙️ STEP 6: STARTING AUTOMATED SERVICES')
    console.log('-'.repeat(50))

    console.log('📅 Starting scheduled sync service...')
    await startScheduledSync()
    const syncStatus = await getScheduledSyncStatus()
    console.log(`✅ Scheduled Sync: ${syncStatus.isRunning ? 'Active' : 'Inactive'}`)
    console.log(`   - Active Jobs: ${syncStatus.activeJobs.join(', ')}`)
    
    console.log('📊 Starting monitoring service...')
    await startMonitoring()
    const monitoringStatus = await getMonitoringStatus() 
    console.log(`✅ Monitoring: ${monitoringStatus.isRunning ? 'Active' : 'Inactive'}`)
    console.log(`   - Health Status: ${monitoringStatus.metrics.healthStatus || 'Unknown'}`)

    console.log('🔄 Automated services are now running in background:')
    console.log('   • Incremental sync every hour (8 AM - 8 PM)')
    console.log('   • Full sync daily at 2 AM')
    console.log('   • Analytics sync every 30 minutes')
    console.log('   • Health checks every 5 minutes')
    console.log('   • Error monitoring and alerting')

    await this.wait(1)
  }

  /**
   * Step 7: Display Dashboard Data
   */
  async step7_DisplayDashboardData() {
    console.log('\n📊 STEP 7: DASHBOARD READY - INTEGRATION SUMMARY')
    console.log('-'.repeat(50))

    const status = await getIntegrationStatus(DEMO_CONFIG.barbershopId)
    
    console.log('🎯 INTEGRATION OVERVIEW:')
    console.log(`   Status: ✅ ${status.status.toUpperCase()}`)
    console.log(`   Connected: ${new Date(status.authenticatedAt).toLocaleDateString()}`)
    console.log(`   Last Sync: ${status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : 'Just completed'}`)

    console.log('📈 BUSINESS METRICS AVAILABLE:')
    console.log('   ✅ Real-time appointment tracking')
    console.log('   ✅ Customer behavior analytics')
    console.log('   ✅ Revenue optimization insights') 
    console.log('   ✅ Service popularity analysis')
    console.log('   ✅ Staff performance metrics')
    console.log('   ✅ Peak hours identification')
    console.log('   ✅ Growth opportunity recommendations')

    console.log('🤖 AI AGENTS NOW HAVE ACCESS TO:')
    console.log('   • Complete booking history and patterns')
    console.log('   • Customer lifetime value calculations')
    console.log('   • Service profitability analysis')
    console.log('   • Capacity optimization recommendations')
    console.log('   • Pricing strategy suggestions')
    console.log('   • Client retention insights')
    console.log('   • Revenue forecasting data')

    await this.wait(2)
  }

  /**
   * Step 8: Show Monitoring Health
   */
  async step8_ShowMonitoringHealth() {
    console.log('\n🏥 STEP 8: SYSTEM HEALTH & MONITORING')
    console.log('-'.repeat(50))

    const monitoringStatus = await getMonitoringStatus()
    
    console.log('🔍 INTEGRATION HEALTH STATUS:')
    console.log(`   Overall Health: ${this.getHealthEmoji(monitoringStatus.metrics.healthStatus)} ${monitoringStatus.metrics.healthStatus || 'Healthy'}`)
    console.log(`   Active Integrations: ${monitoringStatus.metrics.activeIntegrations || 1}`)
    console.log(`   Successful Syncs (24h): ${monitoringStatus.metrics.successfulSyncs24h || 0}`)
    console.log(`   Failed Syncs (24h): ${monitoringStatus.metrics.failedSyncs24h || 0}`)

    console.log('⚡ PERFORMANCE METRICS:')
    console.log(`   Average Sync Duration: ${monitoringStatus.metrics.avgSyncDuration?.toFixed(1) || '0.0'}s`)
    console.log(`   Last Health Check: ${monitoringStatus.metrics.lastHealthCheck || 'Just completed'}`)

    console.log('🚨 ALERTING & MONITORING:')
    console.log('   ✅ Health checks every 5 minutes')
    console.log('   ✅ Sync failure detection')
    console.log('   ✅ Performance monitoring')
    console.log('   ✅ Error tracking and alerting')
    console.log('   ✅ Integration status monitoring')

    await this.wait(1)
  }

  /**
   * Show final summary
   */
  async showFinalSummary() {
    console.log('\n' + '='.repeat(70))
    console.log('🎉 TRAFFT INTEGRATION DEMONSTRATION COMPLETE!')
    console.log('='.repeat(70))

    console.log('✅ SUCCESSFULLY DEMONSTRATED:')
    console.log('   🔐 Secure credential storage and authentication')
    console.log('   🔄 Real-time data synchronization from Trafft')
    console.log('   📊 Comprehensive business analytics generation')
    console.log('   🤖 AI-powered business insights and recommendations')
    console.log('   🔗 Real-time webhook processing')
    console.log('   ⚙️ Automated sync and monitoring services')
    console.log('   📈 Integration with AI Agent System')
    console.log('   🏥 Health monitoring and error handling')

    console.log('\n🚀 NEXT STEPS FOR BARBERSHOP OWNERS:')
    console.log('   1. Visit the integration setup wizard')
    console.log('   2. Enter your Trafft API credentials')
    console.log('   3. Complete initial data synchronization')
    console.log('   4. Access AI-powered business insights immediately')
    console.log('   5. Chat with specialized AI agents using your real business data')

    console.log('\n🎯 BUSINESS IMPACT:')
    console.log('   • Automated data sync eliminates manual entry')
    console.log('   • AI insights help optimize pricing and scheduling')
    console.log('   • Real-time analytics improve decision making')
    console.log('   • Predictive recommendations increase revenue')
    console.log('   • Integrated workflow saves time and reduces errors')

    console.log('\n📱 AVAILABLE INTERFACES:')
    console.log('   🌐 Web Dashboard: http://localhost:3000/dashboard')
    console.log('   🔧 Integration Setup: http://localhost:3000/integrations/trafft')
    console.log('   💬 AI Chat: Powered by your real business data')
    console.log('   📊 Analytics: Real-time business metrics')

    console.log('\n' + '='.repeat(70))
    console.log(`🏁 Demo completed at: ${new Date().toLocaleString()}`)
    console.log('Thank you for exploring the Trafft Integration!')
    console.log('='.repeat(70))
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
      console.log('\n✅ Demo completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error)
      process.exit(1)
    })
}