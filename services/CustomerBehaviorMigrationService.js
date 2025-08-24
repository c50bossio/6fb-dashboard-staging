/**
 * Customer Behavior Migration Service
 * Migrates existing customer data to the new behavior scoring system
 * One-time migration utility for existing barbershops
 */

export class CustomerBehaviorMigrationService {
  constructor() {
    this.migratedCount = 0
    this.errorCount = 0
    this.errors = []
  }

  /**
   * Migrate all customers for a barbershop to the new scoring system
   */
  async migrateBarbershop(barbershopId) {
    console.log(`Starting migration for barbershop: ${barbershopId}`)
    
    try {
      // Reset counters
      this.migratedCount = 0
      this.errorCount = 0
      this.errors = []
      
      // Call the bulk calculation API
      const response = await fetch('/api/customer-behavior/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_calculate_scores',
          barbershop_id: barbershopId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Migration API call failed: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      this.migratedCount = result.processed
      this.errorCount = result.errors
      
      // Update barbershop statistics after migration
      await this.updateStatistics(barbershopId)
      
      console.log(`Migration completed for barbershop ${barbershopId}:`)
      console.log(`- Processed: ${this.migratedCount} customers`)
      console.log(`- Errors: ${this.errorCount}`)
      
      return {
        success: true,
        barbershopId,
        processed: this.migratedCount,
        errors: this.errorCount,
        total: result.total
      }
      
    } catch (error) {
      console.error('Migration failed:', error)
      return {
        success: false,
        barbershopId,
        error: error.message
      }
    }
  }

  /**
   * Migrate a single customer's behavior data
   */
  async migrateCustomer(barbershopId, customerId) {
    try {
      // Get customer's historical data
      const behaviorData = await this.extractCustomerBehaviorData(customerId, barbershopId)
      
      // Calculate and store risk score
      const response = await fetch('/api/customer-behavior/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate_risk_score',
          barbershop_id: barbershopId,
          customer_id: customerId,
          data: behaviorData
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to calculate risk score: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      return {
        success: true,
        customerId,
        riskScore: result.risk_score,
        riskTier: result.risk_tier
      }
      
    } catch (error) {
      console.error(`Customer migration failed for ${customerId}:`, error)
      return {
        success: false,
        customerId,
        error: error.message
      }
    }
  }

  /**
   * Extract behavior data from existing appointment/booking records
   */
  async extractCustomerBehaviorData(customerId, barbershopId) {
    try {
      // This would be replaced with actual database queries in production
      // For now, we'll simulate the data extraction
      
      // Get appointments from Supabase
      const appointmentsResponse = await fetch(`/api/appointments?customer_id=${customerId}&barbershop_id=${barbershopId}`)
      const appointments = appointmentsResponse.ok ? await appointmentsResponse.json() : []
      
      // Get bookings from Supabase
      const bookingsResponse = await fetch(`/api/bookings?customer_id=${customerId}&shop_id=${barbershopId}`)
      const bookings = bookingsResponse.ok ? await bookingsResponse.json() : []
      
      const allBookings = [...(appointments.data || []), ...(bookings.data || [])]
      
      // Calculate behavior metrics
      const noShows = allBookings.filter(b => 
        b.status === 'no-show' || b.status === 'NO_SHOW'
      ).length
      
      const lateCancellations = allBookings.filter(b => {
        if (b.status !== 'cancelled' && b.status !== 'CANCELLED') return false
        
        const appointmentTime = new Date(b.start_time || b.appointment_time || 0)
        const cancelTime = new Date(b.cancelled_at || b.updated_at || 0)
        const hoursDifference = (appointmentTime - cancelTime) / (1000 * 60 * 60)
        
        return hoursDifference < 24 // Cancelled within 24 hours
      }).length
      
      // Calculate average advance booking time
      const advanceBookingTimes = allBookings
        .filter(b => b.start_time && b.created_at)
        .map(b => {
          const appointmentTime = new Date(b.start_time || b.appointment_time)
          const bookingTime = new Date(b.created_at)
          return (appointmentTime - bookingTime) / (1000 * 60 * 60 * 24) // Days
        })
        .filter(days => days > 0)
      
      const avgAdvanceBookingDays = advanceBookingTimes.length > 0 
        ? advanceBookingTimes.reduce((a, b) => a + b, 0) / advanceBookingTimes.length 
        : 1
      
      // Count payment failures (simplified)
      const failedPayments = allBookings.filter(b => 
        b.payment_status === 'failed' || 
        b.payment_status === 'FAILED'
      ).length
      
      // Estimate communication metrics (simplified)
      const totalMessages = Math.max(allBookings.length, 1) // At least one message per booking
      const responseRate = this.estimateResponseRate(allBookings)
      const messageResponses = Math.floor(totalMessages * responseRate)
      
      return {
        total_bookings: allBookings.length,
        no_show_count: noShows,
        late_cancellation_count: lateCancellations,
        avg_advance_booking_days: Math.round(avgAdvanceBookingDays * 100) / 100,
        failed_payment_count: failedPayments,
        total_messages_sent: totalMessages,
        message_responses: messageResponses,
        last_booking_date: this.getLastBookingDate(allBookings)
      }
      
    } catch (error) {
      console.error('Failed to extract customer behavior data:', error)
      
      // Return minimal data if extraction fails
      return {
        total_bookings: 0,
        no_show_count: 0,
        late_cancellation_count: 0,
        avg_advance_booking_days: 1,
        failed_payment_count: 0,
        total_messages_sent: 1,
        message_responses: 1,
        last_booking_date: null
      }
    }
  }

  /**
   * Estimate customer communication response rate based on booking patterns
   */
  estimateResponseRate(bookings) {
    if (bookings.length === 0) return 1.0
    
    // Higher response rate for customers with:
    // - More completed appointments
    // - Fewer no-shows
    // - More recent bookings
    
    const completedBookings = bookings.filter(b => 
      b.status === 'completed' || b.status === 'COMPLETED'
    ).length
    
    const noShows = bookings.filter(b => 
      b.status === 'no-show' || b.status === 'NO_SHOW'
    ).length
    
    const completionRate = bookings.length > 0 ? completedBookings / bookings.length : 0
    const noShowRate = bookings.length > 0 ? noShows / bookings.length : 0
    
    // Calculate response rate (0.4 to 1.0 range)
    let responseRate = 0.6 + (completionRate * 0.3) - (noShowRate * 0.2)
    
    // Check recency of bookings
    const recentBookings = bookings.filter(b => {
      const bookingDate = new Date(b.created_at || 0)
      const monthsAgo = (Date.now() - bookingDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return monthsAgo <= 6 // Within last 6 months
    }).length
    
    if (recentBookings > bookings.length * 0.5) {
      responseRate += 0.1 // Boost for recent activity
    }
    
    return Math.max(0.4, Math.min(1.0, responseRate))
  }

  /**
   * Get the most recent booking date
   */
  getLastBookingDate(bookings) {
    if (bookings.length === 0) return null
    
    const dates = bookings
      .map(b => new Date(b.start_time || b.appointment_time || b.created_at || 0))
      .filter(d => d.getTime() > 0)
    
    if (dates.length === 0) return null
    
    return new Date(Math.max(...dates.map(d => d.getTime()))).toISOString()
  }

  /**
   * Update barbershop statistics after migration
   */
  async updateStatistics(barbershopId) {
    try {
      const response = await fetch('/api/customer-behavior/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_statistics',
          barbershop_id: barbershopId
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update statistics: ${response.statusText}`)
      }
      
      console.log(`Updated statistics for barbershop ${barbershopId}`)
      
    } catch (error) {
      console.error('Failed to update statistics:', error)
    }
  }

  /**
   * Get migration summary for a barbershop
   */
  getMigrationSummary() {
    return {
      processed: this.migratedCount,
      errors: this.errorCount,
      errorDetails: this.errors,
      successRate: this.migratedCount + this.errorCount > 0 
        ? (this.migratedCount / (this.migratedCount + this.errorCount) * 100).toFixed(1) + '%'
        : '0%'
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration(barbershopId) {
    try {
      const response = await fetch(`/api/customer-behavior/manage?barbershop_id=${barbershopId}&type=statistics`)
      
      if (!response.ok) {
        throw new Error(`Failed to validate migration: ${response.statusText}`)
      }
      
      const result = await response.json()
      const stats = result.statistics
      
      if (!stats) {
        return {
          valid: false,
          message: 'No statistics found for barbershop'
        }
      }
      
      return {
        valid: true,
        statistics: {
          totalCustomers: stats.total_customers,
          greenTier: stats.green_tier_count,
          yellowTier: stats.yellow_tier_count,
          redTier: stats.red_tier_count,
          averageRiskScore: stats.average_risk_score
        },
        message: `Migration validated: ${stats.total_customers} customers processed`
      }
      
    } catch (error) {
      return {
        valid: false,
        message: `Validation failed: ${error.message}`
      }
    }
  }
}

// Export singleton instance
export const customerBehaviorMigration = new CustomerBehaviorMigrationService()
export default customerBehaviorMigration