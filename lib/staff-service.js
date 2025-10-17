/**
 * Unified Staff Service
 * Centralizes all staff-related business logic, data operations, and calculations
 * Follows CLAUDE.md patterns - separate queries, JavaScript merging, real data only
 */

import { getDisplayName, normalizeNameData, createNameUpdateObject } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { formatCurrency } from '@/lib/utils'

export class StaffService {
  constructor() {
    this.supabase = createClient()
  }

  /**
   * Get barbershop ID for current user
   * Follows CLAUDE.md shop ID resolution pattern
   */
  async getUserbarbershopId() {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: profile } = await this.supabase
        .from('profiles')
        .select('barbershop_id, barbershop_id, id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      // Multiple fallback methods for shop ID resolution (CLAUDE.md pattern)
      let barbershopId = profile.barbershop_id || profile.barbershop_id

      // If no direct association, check staff table
      if (!barbershopId) {
        const { data: staffRecord } = await this.supabase
          .from('barbershop_staff')
          .select('barbershop_id')
          .eq('user_id', profile.id)
          .eq('is_active', true)
          .single()
        
        barbershopId = staffRecord?.barbershop_id
      }

      if (!barbershopId) {
        throw new Error('No barbershop association found')
      }

      return { barbershopId, userId: user.id, profile }
    } catch (error) {
      console.error('Error getting barbershop ID:', error)
      throw error
    }
  }

  /**
   * Load comprehensive staff data with metrics
   * Uses separate queries and JavaScript merging (CLAUDE.md pattern)
   */
  async loadStaffData(barbershopId = null) {
    try {
      // Get barbershop ID if not provided
      if (!barbershopId) {
        const result = await this.getUserbarbershopId()
        barbershopId = result.barbershopId
      }

      // Step 1: Fetch staff data (no PostgREST joins)
      const { data: staffData, error: staffError } = await this.supabase
        .from('barbershop_staff')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .order('created_at', { ascending: false })

      if (staffError) throw staffError

      if (!staffData || staffData.length === 0) {
        return {
          staff: [],
          metrics: this.getEmptyMetrics()
        }
      }

      // Step 2: Get user profiles separately with enhanced name support
      const userIds = staffData.map(s => s.user_id).filter(Boolean)
      const { data: profiles } = await this.supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, phone')
        .in('id', userIds)

      // Step 3: Get commission balances separately
      const { data: commissionBalances } = await this.supabase
        .from('barber_commission_balances')
        .select('barber_id, pending_amount, paid_amount, total_earned')
        .in('barber_id', userIds)

      // Step 4: Get financial arrangements separately
      const { data: financialArrangements } = await this.supabase
        .from('financial_arrangements')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      // Step 5: Get recent appointments for metrics (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: appointments } = await this.supabase
        .from('appointments')
        .select('barber_id, status, price, start_time')
        .eq('barbershop_id', barbershopId)
        .gte('start_time', thirtyDaysAgo.toISOString())

      // Step 6: Merge data in JavaScript with enhanced name handling
      const enrichedStaffData = staffData.map(staff => {
        const profile = profiles?.find(p => p.id === staff.user_id) || {}
        const balance = commissionBalances?.find(b => b.barber_id === staff.user_id) || {}
        const arrangement = financialArrangements?.find(a => a.barber_id === staff.user_id) || {}
        const staffAppointments = appointments?.filter(a => a.barber_id === staff.user_id) || []

        // Normalize name data for consistent handling
        const normalizedNames = normalizeNameData({
          firstName: profile.first_name,
          lastName: profile.last_name,
          fullName: profile.full_name
        })

        // Calculate metrics
        const completedAppointments = staffAppointments.filter(a => a.status === 'completed')
        const totalRevenue = completedAppointments.reduce((sum, a) => sum + (parseFloat(a.price) || 0), 0)
        const pendingCommission = balance.pending_amount || 0

        return {
          ...staff,
          profile: {
            ...profile,
            ...normalizedNames
          },
          commission_balance: balance,
          financial_arrangement: arrangement,
          metrics: {
            totalBookings: completedAppointments.length,
            revenue: totalRevenue,
            pendingCommission,
            averageRating: 0, // Placeholder - rating system not yet implemented
            totalReviews: 0,
            weeklyHours: this.calculateWeeklyHours(staff.schedule),
            isActiveToday: this.isActiveToday(staff.schedule)
          },
          displayName: getDisplayName({
            firstName: normalizedNames.firstName,
            lastName: normalizedNames.lastName,
            fullName: normalizedNames.fullName,
            email: profile.email,
            defaultName: 'Unnamed Staff'
          }),
          compensationModel: this.getCompensationModel(staff, arrangement)
        }
      })

      // Calculate dashboard metrics
      const metrics = this.calculateDashboardMetrics(enrichedStaffData)

      return {
        staff: enrichedStaffData,
        metrics
      }

    } catch (error) {
      console.error('Error loading staff data:', error)
      throw error
    }
  }

  /**
   * Calculate weekly hours from schedule object
   */
  calculateWeeklyHours(schedule) {
    if (!schedule || typeof schedule !== 'object') return 0

    return Object.values(schedule).reduce((total, day) => {
      if (!day?.available || !day?.start || !day?.end) return total
      
      const start = new Date(`2000-01-01 ${day.start}`)
      const end = new Date(`2000-01-01 ${day.end}`)
      const hours = (end - start) / (1000 * 60 * 60)
      
      return total + (hours > 0 ? hours : 0)
    }, 0)
  }

  /**
   * Check if staff member is scheduled for today
   */
  isActiveToday(schedule) {
    if (!schedule || typeof schedule !== 'object') return false

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const todaySchedule = schedule[today]
    
    return todaySchedule?.available && todaySchedule?.start && todaySchedule?.end
  }

  /**
   * Get compensation model summary
   */
  getCompensationModel(staff, arrangement) {
    if (!arrangement || !arrangement.arrangement_type) {
      return {
        type: staff.financial_model || 'unknown',
        display: 'Not Set',
        rate: null
      }
    }

    switch (arrangement.arrangement_type) {
      case 'commission':
        const rate = (arrangement.commission_rate || staff.commission_rate || 0) * 100
        return {
          type: 'commission',
          display: `${rate.toFixed(0)}% Commission`,
          rate: rate / 100
        }
      case 'booth_rent':
        return {
          type: 'booth_rent',
          display: 'Booth Rent',
          rate: arrangement.booth_rent_amount || 0
        }
      case 'hybrid':
        return {
          type: 'hybrid',
          display: 'Hybrid Model',
          rate: arrangement.commission_rate || 0
        }
      default:
        return {
          type: 'unknown',
          display: 'Unknown',
          rate: null
        }
    }
  }

  /**
   * Calculate dashboard metrics from staff data
   */
  calculateDashboardMetrics(staffData) {
    if (!staffData || staffData.length === 0) {
      return this.getEmptyMetrics()
    }

    const totalStaff = staffData.length
    const activeStaff = staffData.filter(s => s.is_active)
    const activeToday = staffData.filter(s => s.metrics.isActiveToday).length
    const totalPendingPayroll = activeStaff.reduce((sum, s) => sum + (s.metrics.pendingCommission || 0), 0)
    const totalRevenue = activeStaff.reduce((sum, s) => sum + (s.metrics.revenue || 0), 0)
    const totalBookings = activeStaff.reduce((sum, s) => sum + (s.metrics.totalBookings || 0), 0)
    
    // Calculate average rating (when rating system is implemented)
    const staffWithRatings = activeStaff.filter(s => s.metrics.averageRating > 0)
    const avgRating = staffWithRatings.length > 0 
      ? staffWithRatings.reduce((sum, s) => sum + s.metrics.averageRating, 0) / staffWithRatings.length
      : 0

    return {
      totalStaff,
      activeStaff: activeStaff.length,
      activeToday,
      pendingPayroll: totalPendingPayroll,
      avgRating,
      totalRevenue,
      totalBookings,
      avgBookingsPerStaff: activeStaff.length > 0 ? totalBookings / activeStaff.length : 0,
      revenuePerStaff: activeStaff.length > 0 ? totalRevenue / activeStaff.length : 0
    }
  }

  /**
   * Get empty metrics structure
   */
  getEmptyMetrics() {
    return {
      totalStaff: 0,
      activeStaff: 0,
      activeToday: 0,
      pendingPayroll: 0,
      avgRating: 0,
      totalRevenue: 0,
      totalBookings: 0,
      avgBookingsPerStaff: 0,
      revenuePerStaff: 0
    }
  }

  /**
   * Create new staff invitation
   * Integrates with existing staff invitation system
   */
  async createStaffInvitation(invitationData) {
    try {
      const { barbershopId, userId } = await this.getUserbarbershopId()
      
      // Generate secure invitation token
      const invitationToken = this.generateInvitationToken()
      
      // Set expiration (7 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      // Prepare invitation data with normalized names
      const nameUpdate = createNameUpdateObject({
        firstName: invitationData.firstName || invitationData.first_name,
        lastName: invitationData.lastName || invitationData.last_name,
        fullName: invitationData.fullName || invitationData.full_name
      })

      const staffInvitation = {
        barbershop_id: barbershopId,
        invited_by: userId,
        email: invitationData.email,
        full_name: nameUpdate.fullName,
        first_name: nameUpdate.firstName,
        last_name: nameUpdate.lastName,
        role: invitationData.role || 'BARBER',
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata: {
          ...invitationData,
          source: 'StaffService'
        }
      }

      const { data, error } = await this.supabase
        .from('staff_invitations')
        .insert([staffInvitation])
        .select()
        .single()

      if (error) throw error

      // Also create financial arrangement if specified
      if (invitationData.financial_model) {
        await this.createFinancialArrangement(data.id, invitationData)
      }

      return {
        success: true,
        invitation: data,
        invitationUrl: this.generateInvitationUrl(invitationToken)
      }

    } catch (error) {
      console.error('Error creating staff invitation:', error)
      throw error
    }
  }

  /**
   * Generate secure invitation token
   */
  generateInvitationToken() {
    const timestamp = Date.now().toString()
    const randomBytes = crypto.getRandomValues(new Uint8Array(16))
    const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('')
    
    return Buffer.from(`${timestamp}-${randomString}`).toString('base64')
      .replace(/[+/=]/g, '')
      .substring(0, 32)
  }

  /**
   * Generate invitation URL
   */
  generateInvitationUrl(token) {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://bookedbarber.com'
      : 'http://localhost:9999'
    
    return `${baseUrl}/shop/settings/staff/onboarding?token=${token}`
  }

  /**
   * Create financial arrangement for invited staff
   */
  async createFinancialArrangement(invitationId, invitationData) {
    try {
      const { barbershopId } = await this.getUserbarbershopId()

      const arrangementData = {
        barbershop_id: barbershopId,
        barber_id: null, // Will be set when invitation is accepted
        arrangement_type: invitationData.financial_model,
        commission_rate: invitationData.commission_rate || 0.60,
        booth_rent_amount: invitationData.booth_rent_amount || null,
        is_active: false, // Will be activated when invitation is accepted
        effective_date: new Date().toISOString().split('T')[0],
        metadata: {
          invitation_id: invitationId,
          created_via: 'staff_invitation'
        }
      }

      const { data, error } = await this.supabase
        .from('financial_arrangements')
        .insert([arrangementData])
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error creating financial arrangement:', error)
      throw error
    }
  }

  /**
   * Update staff member
   */
  async updateStaff(staffId, updateData) {
    try {
      const { data, error } = await this.supabase
        .from('barbershop_staff')
        .update(updateData)
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error updating staff:', error)
      throw error
    }
  }

  /**
   * Deactivate staff member (soft delete)
   */
  async deactivateStaff(staffId) {
    try {
      const { data, error } = await this.supabase
        .from('barbershop_staff')
        .update({ is_active: false, deactivated_at: new Date().toISOString() })
        .eq('id', staffId)
        .select()
        .single()

      if (error) throw error
      return data

    } catch (error) {
      console.error('Error deactivating staff:', error)
      throw error
    }
  }

  /**
   * Calculate payroll data for all staff
   */
  async calculatePayrollData(staffData = null) {
    try {
      // Load staff data if not provided
      if (!staffData) {
        const result = await this.loadStaffData()
        staffData = result.staff
      }

      const payrollData = staffData
        .filter(staff => staff.is_active && staff.metrics.pendingCommission > 0)
        .map(staff => ({
          staffId: staff.id,
          name: staff.displayName,
          email: staff.profile.email,
          compensationModel: staff.compensationModel,
          pendingAmount: staff.metrics.pendingCommission,
          totalEarned: staff.commission_balance.total_earned || 0,
          bookingsCount: staff.metrics.totalBookings,
          revenue: staff.metrics.revenue,
          payPeriodStart: this.getPayPeriodStart(),
          payPeriodEnd: this.getPayPeriodEnd()
        }))

      const totals = {
        totalPending: payrollData.reduce((sum, p) => sum + p.pendingAmount, 0),
        totalEarned: payrollData.reduce((sum, p) => sum + p.totalEarned, 0),
        staffCount: payrollData.length,
        totalBookings: payrollData.reduce((sum, p) => sum + p.bookingsCount, 0)
      }

      return {
        payrollData,
        totals,
        payPeriod: {
          start: this.getPayPeriodStart(),
          end: this.getPayPeriodEnd()
        }
      }

    } catch (error) {
      console.error('Error calculating payroll data:', error)
      throw error
    }
  }

  /**
   * Get current pay period start date
   */
  getPayPeriodStart() {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return startOfMonth.toISOString().split('T')[0]
  }

  /**
   * Get current pay period end date
   */
  getPayPeriodEnd() {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return endOfMonth.toISOString().split('T')[0]
  }

  /**
   * Get staff performance metrics
   */
  async getPerformanceMetrics(staffData = null, timeframe = 30) {
    try {
      if (!staffData) {
        const result = await this.loadStaffData()
        staffData = result.staff
      }

      return staffData.map(staff => ({
        staffId: staff.id,
        name: staff.displayName,
        firstName: staff.profile?.firstName,
        lastName: staff.profile?.lastName,
        fullName: staff.profile?.fullName,
        email: staff.profile?.email,
        totalBookings: staff.metrics.totalBookings,
        totalRevenue: staff.metrics.revenue,
        averageRating: staff.metrics.averageRating,
        weeklyHours: staff.metrics.weeklyHours,
        compensationModel: staff.compensationModel,
        efficiency: this.calculateEfficiency(staff.metrics),
        growthTrend: 0 // Placeholder for growth calculation
      }))

    } catch (error) {
      console.error('Error getting performance metrics:', error)
      throw error
    }
  }

  /**
   * Calculate staff efficiency metric
   */
  calculateEfficiency(metrics) {
    if (metrics.weeklyHours === 0) return 0
    return (metrics.totalBookings / metrics.weeklyHours) * 100
  }
}

// Export singleton instance
export const staffService = new StaffService()
export default staffService