/**
 * Business Context Engine
 * Generates AI agent context from multi-platform booking data
 * Creates intelligent business insights for AI-powered recommendations
 */

import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const DATABASE_PATH = process.env.DATABASE_PATH || '/Users/bossio/6FB AI Agent System/agent_system.db'

class BusinessContextEngine {
  constructor() {
    this.db = null
    this.contextGenerators = new Map()
    this.insightCalculators = new Map()
    
    this.initializeContextGenerators()
    this.initializeInsightCalculators()
  }

  /**
   * Initialize database connection
   */
  initDatabase() {
    if (!this.db) {
      this.db = new sqlite3.Database(DATABASE_PATH)
      this.db.getAsync = promisify(this.db.get.bind(this.db))
      this.db.allAsync = promisify(this.db.all.bind(this.db))
      this.db.runAsync = promisify(this.db.run.bind(this.db))
    }
    return this.db
  }

  /**
   * Initialize context generators for different AI agents
   */
  initializeContextGenerators() {
    this.contextGenerators.set('financial', this.generateFinancialContext.bind(this))
    this.contextGenerators.set('operations', this.generateOperationsContext.bind(this))
    this.contextGenerators.set('client_acquisition', this.generateClientAcquisitionContext.bind(this))
    this.contextGenerators.set('brand', this.generateBrandContext.bind(this))
    this.contextGenerators.set('growth', this.generateGrowthContext.bind(this))
    this.contextGenerators.set('master_coach', this.generateMasterCoachContext.bind(this))
    this.contextGenerators.set('strategic_mindset', this.generateStrategicContext.bind(this))
  }

  /**
   * Initialize insight calculators
   */
  initializeInsightCalculators() {
    this.insightCalculators.set('revenue_trends', this.calculateRevenueTrends.bind(this))
    this.insightCalculators.set('client_retention', this.calculateClientRetention.bind(this))
    this.insightCalculators.set('service_performance', this.calculateServicePerformance.bind(this))
    this.insightCalculators.set('peak_hours', this.calculatePeakHours.bind(this))
    this.insightCalculators.set('pricing_optimization', this.calculatePricingOpportunities.bind(this))
    this.insightCalculators.set('capacity_utilization', this.calculateCapacityUtilization.bind(this))
  }

  /**
   * Generate comprehensive business context for AI agents
   */
  async generateBusinessContext(barbershopId, agentType = 'master_coach', options = {}) {
    const db = this.initDatabase()
    
    try {
      const {
        timeframe = '30_days',
        includeComparisons = true,
        includePredictions = true,
        includeRecommendations = true
      } = options

      const baseData = await this.getBaseBusinessData(barbershopId, timeframe)
      
      const insights = await this.calculateAllInsights(barbershopId, timeframe)
      
      const agentContext = await this.generateAgentSpecificContext(
        barbershopId, 
        agentType, 
        baseData, 
        insights
      )
      
      let comparisons = {}
      if (includeComparisons) {
        comparisons = await this.generateComparisons(barbershopId, timeframe)
      }
      
      let predictions = {}
      if (includePredictions) {
        predictions = await this.generatePredictions(barbershopId, baseData, insights)
      }
      
      let recommendations = []
      if (includeRecommendations) {
        recommendations = await this.generateRecommendations(
          barbershopId, 
          agentType, 
          baseData, 
          insights
        )
      }

      const businessContext = {
        barbershopId,
        agentType,
        timeframe,
        generatedAt: new Date().toISOString(),
        baseData,
        insights,
        agentContext,
        comparisons,
        predictions,
        recommendations,
        dataQuality: this.assessDataQuality(baseData),
        platforms: await this.getConnectedPlatforms(barbershopId)
      }

      await this.storeBusinessContext(barbershopId, agentType, businessContext)

      return businessContext

    } catch (error) {
      console.error('Error generating business context:', error)
      throw error
    }
  }

  /**
   * Get base business data from unified appointments
   */
  async getBaseBusinessData(barbershopId, timeframe) {
    const db = this.initDatabase()
    const dateFilter = this.getDateFilter(timeframe)
    
    const appointmentStats = await db.getAsync(`
      SELECT 
        COUNT(*) as total_appointments,
        COUNT(DISTINCT json_extract(client_data, '$.email')) as unique_clients,
        AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_revenue_per_appointment,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_revenue,
        AVG(json_extract(service_data, '$.duration')) as avg_service_duration,
        COUNT(CASE WHEN json_extract(scheduling_data, '$.status') = 'cancelled' THEN 1 END) as cancellations,
        COUNT(CASE WHEN json_extract(scheduling_data, '$.status') = 'no_show' THEN 1 END) as no_shows
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
    `, [barbershopId, dateFilter])

    const serviceBreakdown = await db.allAsync(`
      SELECT 
        json_extract(service_data, '$.category') as service_category,
        json_extract(service_data, '$.name') as service_name,
        COUNT(*) as booking_count,
        AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_price,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_revenue
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
      GROUP BY service_category, service_name
      ORDER BY booking_count DESC
    `, [barbershopId, dateFilter])

    const clientStats = await db.allAsync(`
      SELECT 
        json_extract(client_data, '$.email') as client_email,
        json_extract(client_data, '$.name') as client_name,
        COUNT(*) as visit_count,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_spent,
        MIN(datetime(json_extract(scheduling_data, '$.dateTime'))) as first_visit,
        MAX(datetime(json_extract(scheduling_data, '$.dateTime'))) as last_visit
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
      GROUP BY client_email
      ORDER BY visit_count DESC
    `, [barbershopId, dateFilter])

    const staffStats = await db.allAsync(`
      SELECT 
        json_extract(staff_data, '$.name') as staff_name,
        json_extract(staff_data, '$.id') as staff_id,
        COUNT(*) as appointments_handled,
        AVG(CAST(json_extract(payment_data, '$.total') as REAL)) as avg_revenue_per_appointment,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as total_revenue
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
      GROUP BY staff_name, staff_id
      ORDER BY appointments_handled DESC
    `, [barbershopId, dateFilter])

    return {
      summary: {
        totalAppointments: appointmentStats.total_appointments || 0,
        uniqueClients: appointmentStats.unique_clients || 0,
        totalRevenue: appointmentStats.total_revenue || 0,
        avgRevenuePerAppointment: appointmentStats.avg_revenue_per_appointment || 0,
        avgServiceDuration: appointmentStats.avg_service_duration || 0,
        cancellationRate: appointmentStats.total_appointments > 0 
          ? (appointmentStats.cancellations / appointmentStats.total_appointments) * 100 
          : 0,
        noShowRate: appointmentStats.total_appointments > 0 
          ? (appointmentStats.no_shows / appointmentStats.total_appointments) * 100 
          : 0
      },
      services: serviceBreakdown.map(service => ({
        category: service.service_category,
        name: service.service_name,
        bookingCount: service.booking_count,
        avgPrice: service.avg_price || 0,
        totalRevenue: service.total_revenue || 0,
        revenueShare: appointmentStats.total_revenue > 0 
          ? ((service.total_revenue || 0) / appointmentStats.total_revenue) * 100 
          : 0
      })),
      clients: clientStats.map(client => ({
        email: client.client_email,
        name: client.client_name,
        visitCount: client.visit_count,
        totalSpent: client.total_spent || 0,
        firstVisit: client.first_visit,
        lastVisit: client.last_visit,
        avgSpentPerVisit: client.visit_count > 0 ? (client.total_spent || 0) / client.visit_count : 0,
        customerType: this.categorizeCustomer(client.visit_count, client.total_spent)
      })),
      staff: staffStats.map(staff => ({
        name: staff.staff_name,
        id: staff.staff_id,
        appointmentsHandled: staff.appointments_handled,
        avgRevenuePerAppointment: staff.avg_revenue_per_appointment || 0,
        totalRevenue: staff.total_revenue || 0,
        revenueShare: appointmentStats.total_revenue > 0 
          ? ((staff.total_revenue || 0) / appointmentStats.total_revenue) * 100 
          : 0
      }))
    }
  }

  /**
   * Calculate all business insights
   */
  async calculateAllInsights(barbershopId, timeframe) {
    const insights = {}
    
    for (const [insightType, calculator] of this.insightCalculators) {
      try {
        insights[insightType] = await calculator(barbershopId, timeframe)
      } catch (error) {
        console.error(`Error calculating ${insightType}:`, error)
        insights[insightType] = { error: error.message }
      }
    }
    
    return insights
  }

  /**
   * Generate agent-specific context
   */
  async generateAgentSpecificContext(barbershopId, agentType, baseData, insights) {
    const generator = this.contextGenerators.get(agentType)
    
    if (!generator) {
      console.warn(`No context generator found for agent type: ${agentType}`)
      return { error: `Unknown agent type: ${agentType}` }
    }
    
    return await generator(barbershopId, baseData, insights)
  }

  /**
   * Generate financial context for financial agent
   */
  async generateFinancialContext(barbershopId, baseData, insights) {
    const { summary, services, clients } = baseData
    const { revenue_trends, pricing_optimization, capacity_utilization } = insights
    
    const revenuePerClient = summary.uniqueClients > 0 
      ? summary.totalRevenue / summary.uniqueClients 
      : 0
    
    const topServiceRevenue = services.length > 0 
      ? services[0].totalRevenue 
      : 0
    
    const highValueClients = clients.filter(c => c.totalSpent > summary.avgRevenuePerAppointment * 3).length
    
    return {
      focus: 'Revenue optimization and financial growth',
      keyMetrics: {
        totalRevenue: summary.totalRevenue,
        revenuePerClient: revenuePerClient,
        avgRevenuePerAppointment: summary.avgRevenuePerAppointment,
        topServiceRevenue: topServiceRevenue,
        highValueClientCount: highValueClients,
        capacityUtilization: capacity_utilization?.utilizationRate || 0
      },
      opportunities: [
        ...(pricing_optimization?.underpriced_services || []).map(service => ({
          type: 'pricing',
          description: `${service.name} appears underpriced. Consider ${service.suggestedIncrease}% increase.`,
          impact: 'high',
          effort: 'low'
        })),
        ...(capacity_utilization?.lowUtilizationPeriods || []).map(period => ({
          type: 'capacity',
          description: `Low utilization during ${period.timeSlot}. Consider promotional pricing.`,
          impact: 'medium',
          effort: 'medium'
        }))
      ],
      threats: [
        ...(revenue_trends?.decliningServices || []).map(service => ({
          type: 'revenue_decline',
          description: `${service.name} revenue declining by ${service.declineRate}% this period.`,
          severity: 'high'
        }))
      ],
      recommendations: this.generateFinancialRecommendations(baseData, insights)
    }
  }

  /**
   * Generate operations context for operations agent
   */
  async generateOperationsContext(barbershopId, baseData, insights) {
    const { summary, staff } = baseData
    const { peak_hours, capacity_utilization, service_performance } = insights
    
    return {
      focus: 'Operational efficiency and service delivery',
      keyMetrics: {
        totalAppointments: summary.totalAppointments,
        avgServiceDuration: summary.avgServiceDuration,
        cancellationRate: summary.cancellationRate,
        noShowRate: summary.noShowRate,
        staffUtilization: staff.map(s => ({
          name: s.name,
          utilizationRate: s.appointmentsHandled / summary.totalAppointments * 100
        }))
      },
      peakHours: peak_hours?.busyPeriods || [],
      bottlenecks: [
        ...(summary.cancellationRate > 15 ? [{
          type: 'high_cancellations',
          description: `Cancellation rate of ${summary.cancellationRate.toFixed(1)}% is above optimal threshold`,
          impact: 'high'
        }] : []),
        ...(capacity_utilization?.bottleneckPeriods || []).map(period => ({
          type: 'capacity_bottleneck',
          description: `High demand during ${period.timeSlot} causing scheduling conflicts`,
          impact: 'medium'
        }))
      ],
      opportunities: [
        ...(peak_hours?.underutilizedPeriods || []).map(period => ({
          type: 'schedule_optimization',
          description: `${period.timeSlot} has low utilization - consider staff adjustments`,
          impact: 'medium',
          effort: 'low'
        }))
      ],
      recommendations: this.generateOperationsRecommendations(baseData, insights)
    }
  }

  /**
   * Generate client acquisition context
   */
  async generateClientAcquisitionContext(barbershopId, baseData, insights) {
    const { summary, clients, services } = baseData
    const { client_retention } = insights
    
    const newClients = clients.filter(c => c.visitCount === 1).length
    const returningClients = clients.filter(c => c.visitCount > 1).length
    const averageLifetimeValue = clients.reduce((sum, c) => sum + c.totalSpent, 0) / clients.length
    
    return {
      focus: 'Customer acquisition and retention strategies',
      keyMetrics: {
        totalClients: summary.uniqueClients,
        newClients: newClients,
        returningClients: returningClients,
        retentionRate: client_retention?.retentionRate || 0,
        averageLifetimeValue: averageLifetimeValue || 0,
        newClientRate: summary.uniqueClients > 0 ? (newClients / summary.uniqueClients) * 100 : 0
      },
      clientSegments: {
        vip: clients.filter(c => c.customerType === 'vip').length,
        loyal: clients.filter(c => c.customerType === 'loyal').length,
        regular: clients.filter(c => c.customerType === 'regular').length,
        occasional: clients.filter(c => c.customerType === 'occasional').length,
        oneTime: clients.filter(c => c.customerType === 'one_time').length
      },
      acquisitionChannels: services.map(service => ({
        service: service.name,
        newClientAttraction: 'medium', // Would be calculated from actual data
        conversionRate: 'medium'
      })),
      retentionChallenges: [
        ...(client_retention?.atRiskClients || []).map(client => ({
          type: 'at_risk_client',
          description: `${client.name} hasn't visited in ${client.daysSinceLastVisit} days`,
          value: client.totalSpent
        }))
      ],
      recommendations: this.generateClientAcquisitionRecommendations(baseData, insights)
    }
  }

  /**
   * Generate other agent contexts (simplified for brevity)
   */
  async generateBrandContext(barbershopId, baseData, insights) {
    return {
      focus: 'Brand positioning and premium service development',
      keyMetrics: {
        premiumServiceRevenue: baseData.services.filter(s => s.avgPrice > baseData.summary.avgRevenuePerAppointment * 1.5).reduce((sum, s) => sum + s.totalRevenue, 0),
        clientLoyalty: baseData.clients.filter(c => c.visitCount > 3).length
      },
      recommendations: ['Focus on premium service offerings', 'Develop signature barbershop experience']
    }
  }

  async generateGrowthContext(barbershopId, baseData, insights) {
    return {
      focus: 'Scalable growth and expansion opportunities',
      keyMetrics: {
        growthRate: insights.revenue_trends?.growthRate || 0,
        scalabilityScore: this.calculateScalabilityScore(baseData)
      },
      recommendations: ['Consider additional service lines', 'Evaluate expansion opportunities']
    }
  }

  async generateMasterCoachContext(barbershopId, baseData, insights) {
    return {
      focus: 'Overall business performance and $500/day goal tracking',
      keyMetrics: {
        dailyRevenueAverage: baseData.summary.totalRevenue / 30, // Assuming 30-day period
        goalProgress: (baseData.summary.totalRevenue / 30) / 500 * 100,
        overallHealthScore: this.calculateBusinessHealthScore(baseData, insights)
      },
      recommendations: this.generateMasterCoachRecommendations(baseData, insights)
    }
  }

  async generateStrategicContext(barbershopId, baseData, insights) {
    return {
      focus: 'Long-term strategic planning and competitive positioning',
      keyMetrics: {
        marketPosition: 'strong', // Would be calculated from market data
        competitiveAdvantages: this.identifyCompetitiveAdvantages(baseData)
      },
      recommendations: ['Develop unique value propositions', 'Plan long-term growth strategy']
    }
  }

  /**
   * Calculate revenue trends
   */
  async calculateRevenueTrends(barbershopId, timeframe) {
    const db = this.initDatabase()
    
    const dailyRevenue = await db.allAsync(`
      SELECT 
        DATE(json_extract(scheduling_data, '$.dateTime')) as appointment_date,
        SUM(CAST(json_extract(payment_data, '$.total') as REAL)) as daily_revenue,
        COUNT(*) as appointment_count
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
      GROUP BY appointment_date
      ORDER BY appointment_date
    `, [barbershopId, this.getDateFilter(timeframe)])

    if (dailyRevenue.length < 2) {
      return { growthRate: 0, trend: 'insufficient_data' }
    }

    const firstWeekRevenue = dailyRevenue.slice(0, 7).reduce((sum, day) => sum + (day.daily_revenue || 0), 0)
    const lastWeekRevenue = dailyRevenue.slice(-7).reduce((sum, day) => sum + (day.daily_revenue || 0), 0)
    
    const growthRate = firstWeekRevenue > 0 
      ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 
      : 0

    return {
      growthRate: growthRate,
      trend: growthRate > 5 ? 'growing' : growthRate < -5 ? 'declining' : 'stable',
      dailyAverage: dailyRevenue.reduce((sum, day) => sum + (day.daily_revenue || 0), 0) / dailyRevenue.length,
      bestDay: dailyRevenue.reduce((max, day) => day.daily_revenue > max.daily_revenue ? day : max, dailyRevenue[0]),
      worstDay: dailyRevenue.reduce((min, day) => day.daily_revenue < min.daily_revenue ? day : min, dailyRevenue[0])
    }
  }

  /**
   * Calculate client retention metrics
   */
  async calculateClientRetention(barbershopId, timeframe) {
    const db = this.initDatabase()
    
    const clientVisits = await db.allAsync(`
      SELECT 
        json_extract(client_data, '$.email') as client_email,
        COUNT(*) as visit_count,
        MIN(datetime(json_extract(scheduling_data, '$.dateTime'))) as first_visit,
        MAX(datetime(json_extract(scheduling_data, '$.dateTime'))) as last_visit,
        julianday('now') - julianday(MAX(datetime(json_extract(scheduling_data, '$.dateTime')))) as days_since_last_visit
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
      GROUP BY client_email
    `, [barbershopId])

    const totalClients = clientVisits.length
    const returningClients = clientVisits.filter(c => c.visit_count > 1).length
    const atRiskClients = clientVisits.filter(c => c.days_since_last_visit > 45)

    return {
      retentionRate: totalClients > 0 ? (returningClients / totalClients) * 100 : 0,
      averageVisitsPerClient: totalClients > 0 
        ? clientVisits.reduce((sum, c) => sum + c.visit_count, 0) / totalClients 
        : 0,
      atRiskClients: atRiskClients.map(c => ({
        email: c.client_email,
        visitCount: c.visit_count,
        daysSinceLastVisit: Math.round(c.days_since_last_visit),
        firstVisit: c.first_visit,
        lastVisit: c.last_visit
      }))
    }
  }

  /**
   * Additional insight calculators (simplified implementations)
   */
  async calculateServicePerformance(barbershopId, timeframe) {
    return { topPerformingServices: [], underperformingServices: [] }
  }

  async calculatePeakHours(barbershopId, timeframe) {
    const db = this.initDatabase()
    
    const hourlyData = await db.allAsync(`
      SELECT 
        CAST(strftime('%H', json_extract(scheduling_data, '$.dateTime')) as INTEGER) as hour,
        COUNT(*) as appointment_count
      FROM unified_appointments 
      WHERE barbershop_id = ? 
        AND json_extract(metadata, '$.isDuplicate') IS NULL
        AND datetime(json_extract(scheduling_data, '$.dateTime')) >= datetime('now', ?)
      GROUP BY hour
      ORDER BY appointment_count DESC
    `, [barbershopId, this.getDateFilter(timeframe)])

    return {
      busyPeriods: hourlyData.slice(0, 3).map(h => ({
        hour: h.hour,
        appointmentCount: h.appointment_count,
        timeSlot: `${h.hour}:00-${h.hour + 1}:00`
      })),
      underutilizedPeriods: hourlyData.slice(-3).map(h => ({
        hour: h.hour,
        appointmentCount: h.appointment_count,
        timeSlot: `${h.hour}:00-${h.hour + 1}:00`
      }))
    }
  }

  async calculatePricingOpportunities(barbershopId, timeframe) {
    return { underpriced_services: [], overpriced_services: [] }
  }

  async calculateCapacityUtilization(barbershopId, timeframe) {
    return { utilizationRate: 75, bottleneckPeriods: [], lowUtilizationPeriods: [] }
  }

  /**
   * Helper methods
   */
  getDateFilter(timeframe) {
    const filters = {
      '7_days': '-7 days',
      '30_days': '-30 days',
      '90_days': '-90 days',
      '1_year': '-1 year'
    }
    return filters[timeframe] || '-30 days'
  }

  categorizeCustomer(visitCount, totalSpent) {
    if (visitCount >= 10 && totalSpent >= 500) return 'vip'
    if (visitCount >= 5 && totalSpent >= 250) return 'loyal'
    if (visitCount >= 3) return 'regular'
    if (visitCount === 2) return 'occasional'
    return 'one_time'
  }

  calculateScalabilityScore(baseData) {
    const factors = [
      baseData.summary.avgRevenuePerAppointment > 50 ? 20 : 10,
      baseData.clients.filter(c => c.visitCount > 1).length / baseData.clients.length * 30,
      baseData.staff.length > 1 ? 25 : 15,
      baseData.services.length > 5 ? 25 : 15
    ]
    return factors.reduce((sum, score) => sum + score, 0)
  }

  calculateBusinessHealthScore(baseData, insights) {
    const factors = [
      baseData.summary.totalRevenue > 5000 ? 25 : 15,
      baseData.summary.cancellationRate < 10 ? 25 : 15,
      insights.client_retention?.retentionRate > 50 ? 25 : 15,
      insights.revenue_trends?.growthRate > 0 ? 25 : 15
    ]
    return factors.reduce((sum, score) => sum + score, 0)
  }

  identifyCompetitiveAdvantages(baseData) {
    const advantages = []
    if (baseData.summary.avgRevenuePerAppointment > 60) advantages.push('Premium pricing power')
    if (baseData.clients.filter(c => c.visitCount > 3).length > baseData.clients.length * 0.4) {
      advantages.push('Strong client loyalty')
    }
    if (baseData.services.length > 8) advantages.push('Diverse service offering')
    return advantages
  }

  /**
   * Generate recommendations
   */
  generateFinancialRecommendations(baseData, insights) {
    const recommendations = []
    
    if (baseData.summary.avgRevenuePerAppointment < 50) {
      recommendations.push({
        priority: 'high',
        category: 'pricing',
        action: 'Increase average service prices by 10-15%',
        impact: 'Revenue increase of $' + (baseData.summary.totalRevenue * 0.1).toFixed(0),
        timeframe: '1-2 weeks'
      })
    }
    
    if (baseData.services.length < 5) {
      recommendations.push({
        priority: 'medium',
        category: 'service_expansion',
        action: 'Add premium services (beard treatments, hot towel shaves)',
        impact: 'Potential 20-30% revenue increase',
        timeframe: '1-2 months'
      })
    }
    
    return recommendations
  }

  generateOperationsRecommendations(baseData, insights) {
    const recommendations = []
    
    if (baseData.summary.cancellationRate > 15) {
      recommendations.push({
        priority: 'high',
        category: 'scheduling',
        action: 'Implement confirmation reminders 24h before appointments',
        impact: 'Reduce cancellations by 30-40%',
        timeframe: '1 week'
      })
    }
    
    return recommendations
  }

  generateClientAcquisitionRecommendations(baseData, insights) {
    const recommendations = []
    
    const newClientRate = baseData.clients.filter(c => c.visitCount === 1).length / baseData.clients.length * 100
    
    if (newClientRate > 60) {
      recommendations.push({
        priority: 'high',
        category: 'retention',
        action: 'Implement loyalty program for repeat visits',
        impact: 'Increase retention rate by 25%',
        timeframe: '2-3 weeks'
      })
    }
    
    return recommendations
  }

  generateMasterCoachRecommendations(baseData, insights) {
    const dailyAverage = baseData.summary.totalRevenue / 30
    const recommendations = []
    
    if (dailyAverage < 500) {
      const gap = 500 - dailyAverage
      recommendations.push({
        priority: 'critical',
        category: '$500_goal',
        action: `Need to increase daily revenue by $${gap.toFixed(0)} to reach $500/day goal`,
        suggestions: [
          'Increase booking frequency',
          'Add premium services',
          'Optimize pricing strategy'
        ],
        timeframe: 'immediate'
      })
    }
    
    return recommendations
  }

  /**
   * Additional helper methods
   */
  async generateComparisons(barbershopId, timeframe) {
    return { previousPeriod: {}, industryBenchmark: {} }
  }

  async generatePredictions(barbershopId, baseData, insights) {
    return { nextMonth: {}, nextQuarter: {} }
  }

  assessDataQuality(baseData) {
    const totalAppointments = baseData.summary.totalAppointments
    const clientsWithEmail = baseData.clients.filter(c => c.email && c.email !== '').length
    const appointmentsWithRevenue = baseData.services.reduce((sum, s) => sum + s.bookingCount, 0)
    
    return {
      score: Math.min(100, (clientsWithEmail / baseData.clients.length * 40) + 
                           (appointmentsWithRevenue / totalAppointments * 40) +
                           (baseData.services.length > 0 ? 20 : 0)),
      completeness: {
        clientEmails: clientsWithEmail / baseData.clients.length * 100,
        revenueData: appointmentsWithRevenue / totalAppointments * 100,
        serviceData: baseData.services.length > 0 ? 100 : 0
      }
    }
  }

  async getConnectedPlatforms(barbershopId) {
    const db = this.initDatabase()
    
    const platforms = await db.allAsync(`
      SELECT platform, is_active, last_sync_at, COUNT(*) as appointment_count
      FROM integrations i
      LEFT JOIN unified_appointments ua ON i.id = ua.integration_id
      WHERE i.barbershop_id = ?
      GROUP BY platform, is_active, last_sync_at
    `, [barbershopId])
    
    return platforms.map(p => ({
      platform: p.platform,
      isActive: Boolean(p.is_active),
      lastSync: p.last_sync_at,
      appointmentCount: p.appointment_count || 0
    }))
  }

  async storeBusinessContext(barbershopId, agentType, context) {
    const db = this.initDatabase()
    
    await db.runAsync(`
      INSERT OR REPLACE INTO business_context (
        barbershop_id, context_type, context_data, generated_at
      ) VALUES (?, ?, ?, datetime('now'))
    `, [barbershopId, `${agentType}_context`, JSON.stringify(context)])
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

const businessContextEngine = new BusinessContextEngine()
export default businessContextEngine