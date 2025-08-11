#!/usr/bin/env node

/**
 * Seed Script for Analytics Test Data
 * Populates analytics tables with realistic test data for dashboard development
 * 
 * Usage:
 *   npm run seed:analytics    - Populate with test data
 *   npm run clear:analytics   - Clear all test data
 *   npm run reset:analytics   - Clear and repopulate
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
)

// Test barbershop IDs
const BARBERSHOP_IDS = ['demo-shop-001', 'test-shop-002', 'test-shop-003']

// Utility function to generate random number in range
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Utility function to generate random decimal
const randomDecimal = (min, max, decimals = 2) => 
  (Math.random() * (max - min) + min).toFixed(decimals)

// ==========================================
// SEED BUSINESS METRICS
// ==========================================
async function seedBusinessMetrics() {
  console.log('📊 Seeding business metrics...')
  
  const metrics = []
  const today = new Date()
  
  // Generate 30 days of historical data for each barbershop
  for (const barbershopId of BARBERSHOP_IDS) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Generate realistic daily metrics with some variation
      const baseRevenue = random(2500, 5000)
      const baseCustomers = random(20, 40)
      const baseAppointments = random(25, 45)
      
      metrics.push({
        barbershop_id: barbershopId,
        date: date.toISOString().split('T')[0],
        
        // Revenue metrics
        total_revenue: baseRevenue + random(-500, 500),
        service_revenue: baseRevenue * 0.85,
        product_revenue: baseRevenue * 0.10,
        tip_revenue: baseRevenue * 0.05,
        
        // Customer metrics
        total_customers: baseCustomers,
        new_customers: Math.floor(baseCustomers * 0.25),
        returning_customers: Math.floor(baseCustomers * 0.75),
        
        // Appointment metrics
        total_appointments: baseAppointments,
        completed_appointments: Math.floor(baseAppointments * 0.90),
        cancelled_appointments: Math.floor(baseAppointments * 0.08),
        no_show_appointments: Math.floor(baseAppointments * 0.02),
        
        // Efficiency metrics
        avg_service_duration: random(30, 45),
        avg_wait_time: random(5, 15),
        chair_utilization_rate: randomDecimal(65, 85),
        
        // Satisfaction metrics
        avg_satisfaction_score: randomDecimal(4.2, 4.9),
        total_reviews: random(3, 10)
      })
    }
  }
  
  const { error } = await supabase
    .from('business_metrics')
    .upsert(metrics, { onConflict: 'barbershop_id,date' })
  
  if (error) {
    console.error('Error seeding business metrics:', error)
  } else {
    console.log(`✅ Seeded ${metrics.length} business metrics records`)
  }
}

// ==========================================
// SEED AI INSIGHTS
// ==========================================
async function seedAIInsights() {
  console.log('🤖 Seeding AI insights...')
  
  const insightTemplates = [
    {
      type: 'recommendation',
      title: 'Optimize Thursday Afternoon Scheduling',
      description: 'Analysis shows 35% chair vacancy on Thursday afternoons. Consider promotional pricing or targeted marketing for this time slot.',
      category: 'operations',
      impact: 'high',
      priority: 8
    },
    {
      type: 'alert',
      title: 'Customer Retention Rate Declining',
      description: 'Return customer rate has dropped 12% in the last 2 weeks. Recommend implementing loyalty program or follow-up campaigns.',
      category: 'customer',
      impact: 'high',
      priority: 9
    },
    {
      type: 'opportunity',
      title: 'High Demand for Beard Grooming Services',
      description: 'Beard trim requests increased 45% this month. Consider expanding service menu and training staff on specialized techniques.',
      category: 'revenue',
      impact: 'medium',
      priority: 7
    },
    {
      type: 'trend',
      title: 'Weekend Bookings at Capacity',
      description: 'Saturday bookings are consistently at 95%+ capacity. Consider extending hours or premium pricing for peak times.',
      category: 'efficiency',
      impact: 'medium',
      priority: 6
    },
    {
      type: 'recommendation',
      title: 'Staff Performance Optimization',
      description: 'Marcus has 20% higher customer satisfaction but 15% lower booking rate. Pair with junior barber for mentorship program.',
      category: 'operations',
      impact: 'medium',
      priority: 7
    }
  ]
  
  const insights = []
  
  for (const barbershopId of BARBERSHOP_IDS) {
    // Add 5-10 insights per barbershop
    const numInsights = random(5, 10)
    for (let i = 0; i < numInsights; i++) {
      const template = insightTemplates[i % insightTemplates.length]
      
      insights.push({
        barbershop_id: barbershopId,
        insight_type: template.type,
        title: template.title,
        description: template.description,
        category: template.category,
        impact_level: template.impact,
        priority: template.priority,
        confidence_score: randomDecimal(0.75, 0.95),
        is_active: true,
        is_acknowledged: Math.random() > 0.5,
        generated_by: 'master_coach',
        data_sources: JSON.stringify({
          tables: ['appointments', 'customers', 'transactions'],
          date_range: '30d'
        })
      })
    }
  }
  
  const { error } = await supabase
    .from('ai_insights')
    .upsert(insights)
  
  if (error) {
    console.error('Error seeding AI insights:', error)
  } else {
    console.log(`✅ Seeded ${insights.length} AI insights`)
  }
}

// ==========================================
// SEED AI AGENTS
// ==========================================
async function seedAIAgents() {
  console.log('🤖 Seeding AI agents...')
  
  const agentTypes = [
    { type: 'master_coach', name: 'Master Business Coach', confidence: 0.92 },
    { type: 'financial', name: 'Financial Advisor', confidence: 0.88 },
    { type: 'client_acquisition', name: 'Client Acquisition Specialist', confidence: 0.85 },
    { type: 'operations', name: 'Operations Manager', confidence: 0.90 },
    { type: 'brand', name: 'Brand Strategist', confidence: 0.87 },
    { type: 'growth', name: 'Growth Optimizer', confidence: 0.89 }
  ]
  
  const agents = []
  
  for (const barbershopId of BARBERSHOP_IDS) {
    for (const agent of agentTypes) {
      agents.push({
        barbershop_id: barbershopId,
        agent_name: agent.name,
        agent_type: agent.type,
        status: Math.random() > 0.2 ? 'active' : 'idle',
        is_enabled: true,
        last_activity_at: new Date().toISOString(),
        last_insight: `Generated ${random(3, 8)} recommendations today`,
        total_insights_generated: random(50, 200),
        avg_confidence_score: agent.confidence,
        avg_processing_time_ms: random(500, 2000),
        success_rate: randomDecimal(92, 99)
      })
    }
  }
  
  const { error } = await supabase
    .from('ai_agents')
    .upsert(agents, { onConflict: 'barbershop_id,agent_type' })
  
  if (error) {
    console.error('Error seeding AI agents:', error)
  } else {
    console.log(`✅ Seeded ${agents.length} AI agents`)
  }
}

// ==========================================
// SEED BUSINESS RECOMMENDATIONS
// ==========================================
async function seedBusinessRecommendations() {
  console.log('💡 Seeding business recommendations...')
  
  const recommendationTemplates = [
    {
      title: 'Implement Dynamic Pricing',
      description: 'Adjust prices based on demand patterns. Increase by 15% during peak hours, offer 10% discount during slow periods.',
      category: 'pricing',
      impact: 'high',
      revenue_potential: 3500,
      effort: 'moderate',
      days: 14
    },
    {
      title: 'Launch Referral Program',
      description: 'Offer existing customers $10 credit for each new customer referred. Expected to increase customer base by 20%.',
      category: 'marketing',
      impact: 'high',
      revenue_potential: 5000,
      effort: 'easy',
      days: 7
    },
    {
      title: 'Add Express Services Menu',
      description: 'Create 15-minute quick service options for busy professionals. Charge premium rates for guaranteed timing.',
      category: 'services',
      impact: 'medium',
      revenue_potential: 2500,
      effort: 'easy',
      days: 3
    },
    {
      title: 'Optimize Staff Scheduling',
      description: 'Align staff schedules with demand patterns. Add one barber during peak hours, reduce during slow periods.',
      category: 'staffing',
      impact: 'medium',
      revenue_potential: 1800,
      effort: 'moderate',
      days: 7
    },
    {
      title: 'Create VIP Membership Tier',
      description: 'Launch premium membership with priority booking, exclusive services, and monthly grooming box.',
      category: 'services',
      impact: 'high',
      revenue_potential: 4500,
      effort: 'complex',
      days: 30
    }
  ]
  
  const recommendations = []
  
  for (const barbershopId of BARBERSHOP_IDS) {
    // Add 3-7 recommendations per barbershop
    const numRecs = random(3, 7)
    for (let i = 0; i < numRecs; i++) {
      const template = recommendationTemplates[i % recommendationTemplates.length]
      
      recommendations.push({
        barbershop_id: barbershopId,
        title: template.title,
        description: template.description,
        category: template.category,
        impact_level: template.impact,
        revenue_potential_monthly: template.revenue_potential,
        implementation_effort: template.effort,
        time_to_implement_days: template.days,
        confidence_score: randomDecimal(0.70, 0.95),
        is_implemented: Math.random() > 0.8,
        implementation_steps: JSON.stringify([
          'Analyze current data',
          'Define implementation plan',
          'Train staff',
          'Launch pilot',
          'Monitor and adjust'
        ])
      })
    }
  }
  
  const { error } = await supabase
    .from('business_recommendations')
    .upsert(recommendations)
  
  if (error) {
    console.error('Error seeding recommendations:', error)
  } else {
    console.log(`✅ Seeded ${recommendations.length} business recommendations`)
  }
}

// ==========================================
// SEED TRENDING SERVICES
// ==========================================
async function seedTrendingServices() {
  console.log('📈 Seeding trending services...')
  
  const services = [
    { name: 'Classic Haircut', category: 'haircut', base_bookings: 45 },
    { name: 'Beard Trim & Shape', category: 'beard', base_bookings: 32 },
    { name: 'Hot Towel Shave', category: 'shave', base_bookings: 28 },
    { name: 'Hair & Beard Combo', category: 'combo', base_bookings: 25 },
    { name: 'Kids Haircut', category: 'kids', base_bookings: 18 },
    { name: 'Senior Special', category: 'special', base_bookings: 15 },
    { name: 'Executive Package', category: 'premium', base_bookings: 12 }
  ]
  
  const trendingServices = []
  const today = new Date()
  
  for (const barbershopId of BARBERSHOP_IDS) {
    // Generate 7 days of trending data
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(today)
      date.setDate(date.getDate() - dayOffset)
      
      services.forEach((service, index) => {
        const bookings = service.base_bookings + random(-10, 10)
        
        trendingServices.push({
          barbershop_id: barbershopId,
          date: date.toISOString().split('T')[0],
          service_id: `service-${index + 1}`, // Placeholder ID
          service_name: service.name,
          service_category: service.category,
          total_bookings: bookings,
          unique_customers: Math.floor(bookings * 0.85),
          revenue_generated: bookings * random(25, 60),
          growth_rate: randomDecimal(-15, 25),
          trend_direction: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
          momentum_score: random(3, 9),
          avg_rating: randomDecimal(4.0, 5.0),
          repeat_booking_rate: randomDecimal(30, 70),
          popularity_rank: index + 1
        })
      })
    }
  }
  
  const { error } = await supabase
    .from('trending_services')
    .upsert(trendingServices, { onConflict: 'barbershop_id,service_id,date' })
  
  if (error) {
    console.error('Error seeding trending services:', error)
  } else {
    console.log(`✅ Seeded ${trendingServices.length} trending services records`)
  }
}

// ==========================================
// SEED REALTIME METRICS
// ==========================================
async function seedRealtimeMetrics() {
  console.log('⚡ Seeding realtime metrics...')
  
  const realtimeMetrics = []
  
  for (const barbershopId of BARBERSHOP_IDS) {
    realtimeMetrics.push({
      barbershop_id: barbershopId,
      chairs_occupied: random(0, 4),
      chairs_total: 4,
      customers_waiting: random(0, 3),
      avg_wait_time_minutes: random(5, 25),
      revenue_today: random(500, 1500),
      appointments_today: random(10, 25),
      customers_today: random(8, 20),
      barbers_working: random(2, 4),
      barbers_on_break: random(0, 1),
      expected_customers_next_hour: random(2, 6),
      expected_wait_time_next_hour: random(10, 30),
      has_urgent_alerts: Math.random() > 0.8,
      alert_count: random(0, 3),
      last_updated: new Date().toISOString()
    })
  }
  
  const { error } = await supabase
    .from('realtime_metrics')
    .upsert(realtimeMetrics, { onConflict: 'barbershop_id' })
  
  if (error) {
    console.error('Error seeding realtime metrics:', error)
  } else {
    console.log(`✅ Seeded ${realtimeMetrics.length} realtime metrics records`)
  }
}

// ==========================================
// CLEAR FUNCTIONS
// ==========================================
async function clearAnalyticsData() {
  console.log('🧹 Clearing all analytics data...')
  
  const tables = [
    'business_metrics',
    'ai_insights',
    'ai_agents',
    'business_recommendations',
    'trending_services',
    'realtime_metrics'
  ]
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('barbershop_id', '') // Delete all records
    
    if (error) {
      console.error(`Error clearing ${table}:`, error)
    } else {
      console.log(`✅ Cleared ${table}`)
    }
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================
async function main() {
  const command = process.argv[2] || 'seed'
  
  console.log('🚀 Analytics Data Management Script')
  console.log('====================================')
  
  try {
    switch (command) {
      case 'seed':
        console.log('📦 Seeding test data...\n')
        await seedBusinessMetrics()
        await seedAIInsights()
        await seedAIAgents()
        await seedBusinessRecommendations()
        await seedTrendingServices()
        await seedRealtimeMetrics()
        console.log('\n✨ Successfully seeded all analytics data!')
        break
        
      case 'clear':
        console.log('🗑️  Clearing test data...\n')
        await clearAnalyticsData()
        console.log('\n✨ Successfully cleared all analytics data!')
        break
        
      case 'reset':
        console.log('♻️  Resetting data (clear + seed)...\n')
        await clearAnalyticsData()
        console.log('\n📦 Re-seeding test data...\n')
        await seedBusinessMetrics()
        await seedAIInsights()
        await seedAIAgents()
        await seedBusinessRecommendations()
        await seedTrendingServices()
        await seedRealtimeMetrics()
        console.log('\n✨ Successfully reset all analytics data!')
        break
        
      default:
        console.log('❌ Unknown command:', command)
        console.log('\nUsage:')
        console.log('  node seed-analytics-data.js seed   - Populate with test data')
        console.log('  node seed-analytics-data.js clear  - Clear all test data')
        console.log('  node seed-analytics-data.js reset  - Clear and repopulate')
        process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run the script
main()