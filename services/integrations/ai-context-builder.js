/**
 * AI Context Builder Service
 * 
 * Builds comprehensive context from normalized appointment data for AI agents.
 * Provides business insights, trends, and actionable recommendations.
 */

import DataNormalizationService from './data-normalization-service.js'
import sqlite3 from 'sqlite3'
import { promisify } from 'util'

const DATABASE_PATH = process.env.DATABASE_PATH || '/Users/bossio/6FB AI Agent System/agent_system.db'

function initDatabase() {
  const db = new sqlite3.Database(DATABASE_PATH)
  db.getAsync = promisify(db.get.bind(db))
  db.allAsync = promisify(db.all.bind(db))
  db.runAsync = promisify(db.run.bind(db))
  return db
}

export class AIContextBuilder {
  
  /**
   * Build comprehensive AI context for a barbershop
   */
  static async buildContext(barbershopId, options = {}) {
    const db = initDatabase()
    
    try {
      const {
        includePastDays = 30,
        includeFutureDays = 30,
        includeAnalytics = true,
        includeRecommendations = true
      } = options
      
      // Get date range
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - includePastDays * 24 * 60 * 60 * 1000)
      const futureDate = new Date(endDate.getTime() + includeFutureDays * 24 * 60 * 60 * 1000)
      
      // Fetch appointments from all integrations
      const appointments = await db.allAsync(`
        SELECT * FROM appointments 
        WHERE barbershop_id = ? 
        AND start_time BETWEEN ? AND ?
        ORDER BY start_time ASC
      `, [barbershopId, startDate.toISOString(), futureDate.toISOString()])
      
      // Normalize appointments from different platforms
      const normalizedAppointments = []
      for (const appointment of appointments) {
        try {
          const metadata = JSON.parse(appointment.metadata || '{}')
          const attendees = JSON.parse(appointment.attendees || '[]')
          
          const normalizedAppointment = {
            id: appointment.platform_appointment_id,
            platformId: appointment.platform_appointment_id,
            platform: appointment.platform,
            title: appointment.title,
            description: appointment.description,
            startTime: appointment.start_time,
            endTime: appointment.end_time,
            duration: appointment.duration_minutes,
            location: appointment.location,
            status: appointment.status,
            attendees: attendees,
            metadata: metadata,
            created: appointment.created_at,
            updated: appointment.updated_at,
            syncedAt: appointment.synced_at
          }
          
          const normalized = DataNormalizationService.normalizeAppointments([normalizedAppointment], appointment.platform)[0]
          normalizedAppointments.push(normalized)
        } catch (normalizationError) {
          console.warn('Failed to normalize appointment:', appointment.id, normalizationError.message)
        }
      }
      
      // Build context components
      const context = {
        barbershopId,
        generatedAt: new Date().toISOString(),
        dataRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          futureDate: futureDate.toISOString()
        },
        
        // Core appointment data
        appointments: {
          total: normalizedAppointments.length,
          data: normalizedAppointments
        },
        
        // Business overview
        overview: this.buildBusinessOverview(normalizedAppointments),
        
        // Scheduling insights
        scheduling: this.buildSchedulingInsights(normalizedAppointments),
        
        // Customer insights
        customers: this.buildCustomerInsights(normalizedAppointments),
        
        // Service performance
        services: this.buildServiceInsights(normalizedAppointments),
        
        // Revenue analytics
        revenue: this.buildRevenueInsights(normalizedAppointments),
        
        // Operational metrics
        operations: this.buildOperationalInsights(normalizedAppointments)
      }
      
      // Add analytics if requested
      if (includeAnalytics) {
        context.analytics = await this.buildAdvancedAnalytics(barbershopId, normalizedAppointments, db)
      }
      
      // Add AI recommendations if requested
      if (includeRecommendations) {
        context.recommendations = this.buildRecommendations(context)
      }
      
      // Add integration status
      context.integrations = await this.getIntegrationStatus(barbershopId, db)
      
      return context
      
    } finally {
      db.close()
    }
  }
  
  /**
   * Build business overview
   */
  static buildBusinessOverview(appointments) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const todayAppointments = appointments.filter(apt => apt.startTime.startsWith(today))
    const weekAppointments = appointments.filter(apt => new Date(apt.startTime) >= thisWeek)
    const monthAppointments = appointments.filter(apt => new Date(apt.startTime) >= thisMonth)
    const upcomingAppointments = appointments.filter(apt => new Date(apt.startTime) > now)
    const completedAppointments = appointments.filter(apt => apt.status === 'completed')
    
    return {
      today: {
        appointments: todayAppointments.length,
        revenue: todayAppointments.reduce((sum, apt) => sum + (apt.service.price || 0), 0),
        nextAppointment: todayAppointments.find(apt => new Date(apt.startTime) > now) || null
      },
      week: {
        appointments: weekAppointments.length,
        revenue: weekAppointments.reduce((sum, apt) => sum + (apt.service.price || 0), 0),
        completionRate: weekAppointments.length > 0 ? (completedAppointments.filter(apt => new Date(apt.startTime) >= thisWeek).length / weekAppointments.length * 100) : 0
      },
      month: {
        appointments: monthAppointments.length,
        revenue: monthAppointments.reduce((sum, apt) => sum + (apt.service.price || 0), 0),
        averageDailyBookings: monthAppointments.length / 30
      },
      upcoming: {
        count: upcomingAppointments.length,
        next24Hours: upcomingAppointments.filter(apt => 
          new Date(apt.startTime) <= new Date(now.getTime() + 24 * 60 * 60 * 1000)
        ).length,
        next7Days: upcomingAppointments.filter(apt => 
          new Date(apt.startTime) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        ).length
      }
    }
  }
  
  /**
   * Build scheduling insights
   */
  static buildSchedulingInsights(appointments) {
    // Peak hours analysis
    const hourlyBookings = {}
    const dailyBookings = {}
    
    appointments.forEach(apt => {
      const startTime = new Date(apt.startTime)
      const hour = startTime.getHours()
      const day = startTime.getDay() // 0 = Sunday, 1 = Monday, etc.
      
      hourlyBookings[hour] = (hourlyBookings[hour] || 0) + 1
      dailyBookings[day] = (dailyBookings[day] || 0) + 1
    })
    
    // Find peak hours
    const peakHours = Object.entries(hourlyBookings)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count, timeSlot: this.formatHour(parseInt(hour)) }))
    
    // Find peak days
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const peakDays = Object.entries(dailyBookings)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day, count]) => ({ day: dayNames[parseInt(day)], count, dayIndex: parseInt(day) }))
    
    // Calculate average appointment duration
    const totalDuration = appointments.reduce((sum, apt) => sum + (apt.duration || 60), 0)
    const averageDuration = appointments.length > 0 ? totalDuration / appointments.length : 60
    
    // No-show analysis
    const noShows = appointments.filter(apt => apt.status === 'no_show')
    const noShowRate = appointments.length > 0 ? (noShows.length / appointments.length * 100) : 0
    
    return {
      peakHours,
      peakDays,
      averageDuration,
      noShowRate,
      totalBookings: appointments.length,
      hourlyDistribution: hourlyBookings,
      dailyDistribution: dailyBookings,
      busiest: {
        hour: peakHours[0] || null,
        day: peakDays[0] || null
      }
    }
  }
  
  /**
   * Build customer insights
   */
  static buildCustomerInsights(appointments) {
    const customerMap = {}
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    appointments.forEach(apt => {
      const customerId = apt.customer.id || apt.customer.email || apt.customer.name
      if (!customerId) return
      
      if (!customerMap[customerId]) {
        customerMap[customerId] = {
          id: customerId,
          name: apt.customer.name,
          email: apt.customer.email,
          phone: apt.customer.phone,
          appointments: [],
          totalSpent: 0,
          lastVisit: null,
          firstVisit: null
        }
      }
      
      customerMap[customerId].appointments.push(apt)
      customerMap[customerId].totalSpent += apt.service.price || 0
      
      const appointmentDate = new Date(apt.startTime)
      if (!customerMap[customerId].lastVisit || appointmentDate > new Date(customerMap[customerId].lastVisit)) {
        customerMap[customerId].lastVisit = apt.startTime
      }
      if (!customerMap[customerId].firstVisit || appointmentDate < new Date(customerMap[customerId].firstVisit)) {
        customerMap[customerId].firstVisit = apt.startTime
      }
    })
    
    const customers = Object.values(customerMap)
    
    // Calculate metrics
    const newCustomers = customers.filter(customer => 
      new Date(customer.firstVisit) >= thirtyDaysAgo
    )
    const returningCustomers = customers.filter(customer => 
      customer.appointments.length > 1
    )
    const highValueCustomers = customers.filter(customer => 
      customer.totalSpent >= 200
    ).sort((a, b) => b.totalSpent - a.totalSpent)
    
    const retentionRate = customers.length > 0 ? (returningCustomers.length / customers.length * 100) : 0
    const averageSpending = customers.length > 0 ? 
      customers.reduce((sum, customer) => sum + customer.totalSpent, 0) / customers.length : 0
    
    return {
      total: customers.length,
      new: newCustomers.length,
      returning: returningCustomers.length,
      retentionRate,
      averageSpending,
      highValue: highValueCustomers.slice(0, 5),
      recentNew: newCustomers.slice(-5).reverse(),
      insights: {
        mostLoyal: customers.sort((a, b) => b.appointments.length - a.appointments.length)[0] || null,
        biggestSpender: customers.sort((a, b) => b.totalSpent - a.totalSpent)[0] || null
      }
    }
  }
  
  /**
   * Build service insights
   */
  static buildServiceInsights(appointments) {
    const serviceMap = {}
    const categoryMap = {}
    
    appointments.forEach(apt => {
      const serviceName = apt.service.name
      const category = apt.service.category
      
      // Service tracking
      if (!serviceMap[serviceName]) {
        serviceMap[serviceName] = {
          name: serviceName,
          bookings: 0,
          revenue: 0,
          averagePrice: 0,
          category: category,
          duration: apt.service.duration
        }
      }
      
      serviceMap[serviceName].bookings++
      serviceMap[serviceName].revenue += apt.service.price || 0
      serviceMap[serviceName].averagePrice = serviceMap[serviceName].revenue / serviceMap[serviceName].bookings
      
      // Category tracking
      if (!categoryMap[category]) {
        categoryMap[category] = {
          category: category,
          bookings: 0,
          revenue: 0
        }
      }
      
      categoryMap[category].bookings++
      categoryMap[category].revenue += apt.service.price || 0
    })
    
    const services = Object.values(serviceMap)
    const categories = Object.values(categoryMap)
    
    // Sort by popularity and revenue
    const popularServices = services.sort((a, b) => b.bookings - a.bookings).slice(0, 5)
    const highRevenueServices = services.sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    const popularCategories = categories.sort((a, b) => b.bookings - a.bookings)
    
    return {
      total: services.length,
      popular: popularServices,
      highRevenue: highRevenueServices,
      categories: popularCategories,
      insights: {
        mostBooked: popularServices[0] || null,
        highestRevenue: highRevenueServices[0] || null,
        averagePrice: services.length > 0 ? 
          services.reduce((sum, service) => sum + service.averagePrice, 0) / services.length : 0
      }
    }
  }
  
  /**
   * Build revenue insights
   */
  static buildRevenueInsights(appointments) {
    const now = new Date()
    const dailyRevenue = {}
    const monthlyRevenue = {}
    
    let totalRevenue = 0
    
    appointments.forEach(apt => {
      const revenue = apt.service.price || 0
      totalRevenue += revenue
      
      const date = apt.startTime.split('T')[0]
      const month = apt.startTime.substring(0, 7) // YYYY-MM
      
      dailyRevenue[date] = (dailyRevenue[date] || 0) + revenue
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + revenue
    })
    
    const today = now.toISOString().split('T')[0]
    const thisMonth = now.toISOString().substring(0, 7)
    
    // Calculate averages
    const averageDailyRevenue = Object.keys(dailyRevenue).length > 0 ? 
      totalRevenue / Object.keys(dailyRevenue).length : 0
    const averageTicket = appointments.length > 0 ? totalRevenue / appointments.length : 0
    
    // Growth trends
    const sortedDailyRevenue = Object.entries(dailyRevenue).sort(([a], [b]) => a.localeCompare(b))
    const recentTrend = this.calculateTrend(sortedDailyRevenue.slice(-7).map(([, revenue]) => revenue))
    
    return {
      total: totalRevenue,
      today: dailyRevenue[today] || 0,
      thisMonth: monthlyRevenue[thisMonth] || 0,
      averageDaily: averageDailyRevenue,
      averageTicket: averageTicket,
      trend: {
        direction: recentTrend > 0 ? 'up' : recentTrend < 0 ? 'down' : 'stable',
        percentage: Math.abs(recentTrend),
        description: this.describeTrend(recentTrend)
      },
      dailyBreakdown: dailyRevenue,
      monthlyBreakdown: monthlyRevenue,
      projections: {
        dailyGoal: 500, // Default goal, could be user-configurable
        monthlyGoal: 15000,
        dailyProgress: ((dailyRevenue[today] || 0) / 500) * 100,
        monthlyProgress: ((monthlyRevenue[thisMonth] || 0) / 15000) * 100
      }
    }
  }
  
  /**
   * Build operational insights
   */
  static buildOperationalInsights(appointments) {
    const now = new Date()
    const upcomingAppointments = appointments.filter(apt => new Date(apt.startTime) > now)
    const pastAppointments = appointments.filter(apt => new Date(apt.startTime) <= now)
    
    // Status breakdown
    const statusBreakdown = {}
    appointments.forEach(apt => {
      statusBreakdown[apt.status] = (statusBreakdown[apt.status] || 0) + 1
    })
    
    // Platform breakdown
    const platformBreakdown = {}
    appointments.forEach(apt => {
      platformBreakdown[apt.platform] = (platformBreakdown[apt.platform] || 0) + 1
    })
    
    // Calculate completion rate
    const completedAppointments = pastAppointments.filter(apt => apt.status === 'completed')
    const completionRate = pastAppointments.length > 0 ? 
      (completedAppointments.length / pastAppointments.length * 100) : 0
    
    // Calculate no-show rate
    const noShows = pastAppointments.filter(apt => apt.status === 'no_show')
    const noShowRate = pastAppointments.length > 0 ? 
      (noShows.length / pastAppointments.length * 100) : 0
    
    // Cancellation rate
    const cancellations = appointments.filter(apt => apt.status === 'cancelled')
    const cancellationRate = appointments.length > 0 ? 
      (cancellations.length / appointments.length * 100) : 0
    
    return {
      totalAppointments: appointments.length,
      upcoming: upcomingAppointments.length,
      past: pastAppointments.length,
      completionRate,
      noShowRate,
      cancellationRate,
      statusBreakdown,
      platformBreakdown,
      performance: {
        rating: this.calculatePerformanceRating(completionRate, noShowRate, cancellationRate),
        strengths: this.identifyStrengths(completionRate, noShowRate, cancellationRate),
        improvements: this.identifyImprovements(completionRate, noShowRate, cancellationRate)
      }
    }
  }
  
  /**
   * Build advanced analytics
   */
  static async buildAdvancedAnalytics(barbershopId, appointments, db) {
    // Get historical data for trends
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    
    const historicalAppointments = await db.allAsync(`
      SELECT * FROM appointments 
      WHERE barbershop_id = ? 
      AND start_time >= ?
      ORDER BY start_time ASC
    `, [barbershopId, sixMonthsAgo.toISOString()])
    
    // Monthly trends
    const monthlyTrends = this.calculateMonthlyTrends(historicalAppointments)
    
    // Customer lifetime value
    const customerLTV = this.calculateCustomerLTV(appointments)
    
    // Capacity utilization (assuming 8 hour days, 30 min slots)
    const capacityUtilization = this.calculateCapacityUtilization(appointments)
    
    // Seasonal patterns
    const seasonalPatterns = this.analyzeSeasonalPatterns(historicalAppointments)
    
    return {
      trends: {
        monthly: monthlyTrends,
        seasonal: seasonalPatterns
      },
      customerLTV,
      capacity: capacityUtilization,
      predictions: {
        nextMonthBookings: this.predictNextMonthBookings(monthlyTrends),
        revenueGrowth: this.predictRevenueGrowth(monthlyTrends)
      }
    }
  }
  
  /**
   * Build AI recommendations
   */
  static buildRecommendations(context) {
    const recommendations = []
    
    // Revenue optimization
    if (context.revenue.averageTicket < 60) {
      recommendations.push({
        type: 'revenue',
        priority: 'high',
        title: 'Increase Average Ticket Value',
        description: `Current average ticket is $${context.revenue.averageTicket.toFixed(2)}. Consider premium services or bundling.`,
        actions: [
          'Introduce premium service packages',
          'Offer add-on services during appointments',
          'Implement loyalty program with spending tiers'
        ]
      })
    }
    
    // Scheduling optimization
    if (context.operations.noShowRate > 15) {
      recommendations.push({
        type: 'operations',
        priority: 'high',
        title: 'Reduce No-Show Rate',
        description: `${context.operations.noShowRate.toFixed(1)}% no-show rate is impacting revenue.`,
        actions: [
          'Implement appointment deposits',
          'Send automated reminders 24h and 2h before',
          'Create a waitlist for last-minute bookings'
        ]
      })
    }
    
    // Customer retention
    if (context.customers.retentionRate < 70) {
      recommendations.push({
        type: 'customer',
        priority: 'medium',
        title: 'Improve Customer Retention',
        description: `${context.customers.retentionRate.toFixed(1)}% retention rate suggests room for improvement.`,
        actions: [
          'Follow up with customers after appointments',
          'Offer loyalty rewards for repeat visits',
          'Personalize service recommendations'
        ]
      })
    }
    
    // Capacity optimization
    if (context.upcoming.count < 10) {
      recommendations.push({
        type: 'marketing',
        priority: 'medium',
        title: 'Increase Bookings',
        description: `Only ${context.upcoming.count} upcoming appointments. Consider promotional activities.`,
        actions: [
          'Launch social media promotion',
          'Offer discounts for new customers',
          'Encourage customers to book their next appointment'
        ]
      })
    }
    
    // Peak hour optimization
    if (context.scheduling.peakHours.length > 0) {
      const offPeak = this.identifyOffPeakHours(context.scheduling.hourlyDistribution)
      if (offPeak.length > 0) {
        recommendations.push({
          type: 'scheduling',
          priority: 'low',
          title: 'Optimize Off-Peak Hours',
          description: `Consider incentivizing bookings during ${offPeak.join(', ')} to balance capacity.`,
          actions: [
            'Offer discounts for off-peak appointments',
            'Promote off-peak slots on social media',
            'Create special off-peak service packages'
          ]
        })
      }
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }
  
  /**
   * Get integration status
   */
  static async getIntegrationStatus(barbershopId, db) {
    const integrations = await db.allAsync(`
      SELECT * FROM integrations 
      WHERE barbershop_id = ? AND is_active = 1
    `, [barbershopId])
    
    return integrations.map(integration => ({
      id: integration.id,
      platform: integration.platform,
      isActive: Boolean(integration.is_active),
      lastSyncAt: integration.last_sync_at,
      nextSyncAt: integration.next_sync_at,
      lastSyncError: integration.last_sync_error,
      metadata: integration.metadata ? JSON.parse(integration.metadata) : {}
    }))
  }
  
  // Helper methods
  static formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:00 ${period}`
  }
  
  static calculateTrend(values) {
    if (values.length < 2) return 0
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2))
    const secondHalf = values.slice(Math.floor(values.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
    
    return firstAvg === 0 ? 0 : ((secondAvg - firstAvg) / firstAvg) * 100
  }
  
  static describeTrend(trendPercentage) {
    if (Math.abs(trendPercentage) < 5) return 'stable'
    if (trendPercentage > 20) return 'strong growth'
    if (trendPercentage > 5) return 'growing'
    if (trendPercentage < -20) return 'declining sharply'
    if (trendPercentage < -5) return 'declining'
    return 'stable'
  }
  
  static calculatePerformanceRating(completionRate, noShowRate, cancellationRate) {
    let score = 0
    
    // Completion rate scoring (0-40 points)
    if (completionRate >= 95) score += 40
    else if (completionRate >= 90) score += 35
    else if (completionRate >= 85) score += 30
    else if (completionRate >= 80) score += 25
    else score += Math.max(0, completionRate / 2)
    
    // No-show rate scoring (0-30 points, inverted)
    if (noShowRate <= 2) score += 30
    else if (noShowRate <= 5) score += 25
    else if (noShowRate <= 10) score += 20
    else if (noShowRate <= 15) score += 15
    else score += Math.max(0, 30 - noShowRate)
    
    // Cancellation rate scoring (0-30 points, inverted)
    if (cancellationRate <= 5) score += 30
    else if (cancellationRate <= 10) score += 25
    else if (cancellationRate <= 15) score += 20
    else if (cancellationRate <= 20) score += 15
    else score += Math.max(0, 30 - cancellationRate)
    
    return Math.min(100, Math.round(score))
  }
  
  static identifyStrengths(completionRate, noShowRate, cancellationRate) {
    const strengths = []
    
    if (completionRate >= 90) strengths.push('High appointment completion rate')
    if (noShowRate <= 5) strengths.push('Low no-show rate')
    if (cancellationRate <= 10) strengths.push('Low cancellation rate')
    
    return strengths
  }
  
  static identifyImprovements(completionRate, noShowRate, cancellationRate) {
    const improvements = []
    
    if (completionRate < 85) improvements.push('Improve appointment completion rate')
    if (noShowRate > 10) improvements.push('Reduce no-show rate')
    if (cancellationRate > 15) improvements.push('Reduce cancellation rate')
    
    return improvements
  }
  
  static identifyOffPeakHours(hourlyDistribution) {
    const hours = Object.keys(hourlyDistribution).map(Number)
    const bookings = Object.values(hourlyDistribution)
    const avgBookings = bookings.reduce((sum, val) => sum + val, 0) / bookings.length
    
    return hours
      .filter((hour, index) => bookings[index] < avgBookings * 0.7)
      .map(hour => this.formatHour(hour))
  }
  
  static calculateMonthlyTrends(appointments) {
    const monthlyData = {}
    
    appointments.forEach(apt => {
      const month = apt.start_time.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { bookings: 0, revenue: 0 }
      }
      
      monthlyData[month].bookings++
      
      try {
        const metadata = JSON.parse(apt.metadata || '{}')
        monthlyData[month].revenue += metadata.servicePrice || 0
      } catch (e) {
        // Ignore parsing errors
      }
    })
    
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }))
  }
  
  static calculateCustomerLTV(appointments) {
    // Simple LTV calculation based on current data
    const customerSpending = {}
    
    appointments.forEach(apt => {
      const customerId = apt.customer.id || apt.customer.email
      if (!customerId) return
      
      customerSpending[customerId] = (customerSpending[customerId] || 0) + (apt.service.price || 0)
    })
    
    const spendingValues = Object.values(customerSpending)
    return spendingValues.length > 0 
      ? spendingValues.reduce((sum, val) => sum + val, 0) / spendingValues.length 
      : 0
  }
  
  static calculateCapacityUtilization(appointments) {
    // Assuming 8 hours per day, 30-minute slots = 16 slots per day
    const dailyCapacity = 16
    const appointmentsByDay = {}
    
    appointments.forEach(apt => {
      const day = apt.startTime.split('T')[0]
      appointmentsByDay[day] = (appointmentsByDay[day] || 0) + 1
    })
    
    const utilizationRates = Object.values(appointmentsByDay).map(count => 
      Math.min(100, (count / dailyCapacity) * 100)
    )
    
    return utilizationRates.length > 0 
      ? utilizationRates.reduce((sum, val) => sum + val, 0) / utilizationRates.length 
      : 0
  }
  
  static analyzeSeasonalPatterns(appointments) {
    const monthlyBookings = {}
    
    appointments.forEach(apt => {
      const month = new Date(apt.start_time).getMonth()
      monthlyBookings[month] = (monthlyBookings[month] || 0) + 1
    })
    
    return Object.entries(monthlyBookings)
      .map(([month, bookings]) => ({
        month: parseInt(month),
        monthName: new Date(2024, month, 1).toLocaleString('default', { month: 'long' }),
        bookings
      }))
      .sort((a, b) => b.bookings - a.bookings)
  }
  
  static predictNextMonthBookings(monthlyTrends) {
    if (monthlyTrends.length < 3) return null
    
    const recentTrends = monthlyTrends.slice(-3)
    const avgBookings = recentTrends.reduce((sum, trend) => sum + trend.bookings, 0) / recentTrends.length
    const trend = this.calculateTrend(recentTrends.map(t => t.bookings))
    
    return Math.round(avgBookings * (1 + trend / 100))
  }
  
  static predictRevenueGrowth(monthlyTrends) {
    if (monthlyTrends.length < 3) return null
    
    const recentTrends = monthlyTrends.slice(-3)
    return this.calculateTrend(recentTrends.map(t => t.revenue))
  }
}

export default AIContextBuilder