'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from "@/components/ui/card.jsx"
import { 
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  StarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'

export default function StaffPerformanceView({ staff }) {
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d, year
  const [metrics, setMetrics] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('revenue') // revenue, bookings, rating, efficiency

  useEffect(() => {
    loadPerformanceMetrics()
  }, [staff, timeRange])

  const loadPerformanceMetrics = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      if (!staff.length) return

      const barbershopId = staff[0].barbershop_id
      
      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch(timeRange) {
        case '7d': startDate.setDate(startDate.getDate() - 7); break
        case '30d': startDate.setDate(startDate.getDate() - 30); break
        case '90d': startDate.setDate(startDate.getDate() - 90); break
        case 'year': startDate.setFullYear(startDate.getFullYear() - 1); break
      }

      // Load appointments for performance metrics
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', startDate.toISOString())
        .lte('appointment_date', endDate.toISOString())

      // Load customer feedback/ratings if available
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .gte('created_at', startDate.toISOString())

      // Calculate metrics for each staff member
      const staffMetrics = {}
      
      staff.forEach(member => {
        const memberAppointments = appointments?.filter(a => a.barber_id === member.user_id) || []
        const completedAppointments = memberAppointments.filter(a => a.status === 'completed')
        const cancelledAppointments = memberAppointments.filter(a => a.status === 'cancelled')
        const noShowAppointments = memberAppointments.filter(a => a.status === 'no_show')
        
        // Revenue calculation
        const totalRevenue = completedAppointments.reduce((sum, a) => sum + (a.price || 0), 0)
        const avgTicket = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0
        
        // Time utilization
        const totalMinutesWorked = completedAppointments.reduce((sum, a) => {
          if (a.appointment_end_date) {
            const duration = (new Date(a.appointment_end_date) - new Date(a.appointment_date)) / 60000
            return sum + duration
          }
          return sum + 60 // Default 1 hour if no end time
        }, 0)
        
        // Ratings
        const memberReviews = reviews?.filter(r => r.barber_id === member.user_id) || []
        const avgRating = memberReviews.length > 0 
          ? memberReviews.reduce((sum, r) => sum + r.rating, 0) / memberReviews.length 
          : 0
        
        // Client retention (simplified - could be enhanced)
        const uniqueClients = new Set(completedAppointments.map(a => a.customer_id)).size
        const repeatClients = completedAppointments.filter((a, i, arr) => 
          arr.findIndex(x => x.customer_id === a.customer_id) !== i
        ).length
        const retentionRate = uniqueClients > 0 ? (repeatClients / uniqueClients) * 100 : 0
        
        // Performance trend (compare to previous period)
        const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2)
        const firstHalf = completedAppointments.filter(a => new Date(a.appointment_date) < midPoint)
        const secondHalf = completedAppointments.filter(a => new Date(a.appointment_date) >= midPoint)
        const revenueGrowth = firstHalf.length > 0 
          ? ((secondHalf.reduce((s, a) => s + (a.price || 0), 0) - firstHalf.reduce((s, a) => s + (a.price || 0), 0)) / 
             firstHalf.reduce((s, a) => s + (a.price || 0), 0)) * 100
          : 0

        staffMetrics[member.id] = {
          staffId: member.id,
          name: member.user?.full_name || member.user?.email || 'Unknown',
          role: member.role,
          totalBookings: memberAppointments.length,
          completedBookings: completedAppointments.length,
          cancelledBookings: cancelledAppointments.length,
          noShowBookings: noShowAppointments.length,
          completionRate: memberAppointments.length > 0 ? (completedAppointments.length / memberAppointments.length) * 100 : 0,
          totalRevenue,
          avgTicket,
          totalHoursWorked: Math.round(totalMinutesWorked / 60),
          avgRating,
          reviewCount: memberReviews.length,
          uniqueClients,
          repeatClients,
          retentionRate,
          revenueGrowth,
          efficiency: totalMinutesWorked > 0 ? totalRevenue / (totalMinutesWorked / 60) : 0 // Revenue per hour
        }
      })

      setMetrics(staffMetrics)
    } catch (error) {
      console.error('Error loading performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sort staff by selected metric
  const sortedStaff = useMemo(() => {
    const staffArray = Object.values(metrics)
    return staffArray.sort((a, b) => {
      switch(sortBy) {
        case 'revenue': return b.totalRevenue - a.totalRevenue
        case 'bookings': return b.completedBookings - a.completedBookings
        case 'rating': return b.avgRating - a.avgRating
        case 'efficiency': return b.efficiency - a.efficiency
        default: return 0
      }
    })
  }, [metrics, sortBy])

  // Calculate team totals
  const teamTotals = useMemo(() => {
    const staffArray = Object.values(metrics)
    if (staffArray.length === 0) return null
    
    return {
      totalRevenue: staffArray.reduce((sum, s) => sum + s.totalRevenue, 0),
      totalBookings: staffArray.reduce((sum, s) => sum + s.completedBookings, 0),
      avgRating: staffArray.reduce((sum, s) => sum + s.avgRating, 0) / staffArray.length,
      totalClients: staffArray.reduce((sum, s) => sum + s.uniqueClients, 0)
    }
  }, [metrics])

  const MetricCard = ({ label, value, change, icon: Icon, format = 'number' }) => {
    const formatted = format === 'currency' ? formatCurrency(value) :
                      format === 'percent' ? `${value.toFixed(1)}%` :
                      format === 'rating' ? value.toFixed(1) :
                      value.toString()
    
    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          {Icon && <Icon className="h-5 w-5 text-gray-400" />}
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-gray-900">{formatted}</span>
          {change !== undefined && (
            <span className={`ml-2 text-sm flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    )
  }

  const StaffPerformanceCard = ({ staffData }) => {
    const performanceColor = staffData.revenueGrowth >= 0 ? 'green' : 'red'
    const ratingStars = Math.round(staffData.avgRating)
    
    return (
      <Card className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{staffData.name}</h3>
            <p className="text-sm text-gray-600">{staffData.role}</p>
          </div>
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <StarIcon 
                key={i} 
                className={`h-4 w-4 ${i < ratingStars ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
              />
            ))}
            <span className="ml-2 text-sm text-gray-600">({staffData.reviewCount})</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(staffData.totalRevenue)}</p>
            <p className={`text-xs ${performanceColor === 'green' ? 'text-green-600' : 'text-red-600'}`}>
              {staffData.revenueGrowth >= 0 ? '+' : ''}{staffData.revenueGrowth.toFixed(1)}% trend
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Bookings</p>
            <p className="text-lg font-semibold text-gray-900">{staffData.completedBookings}</p>
            <p className="text-xs text-gray-600">{staffData.completionRate.toFixed(0)}% completion</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-xs text-gray-500">Avg Ticket</p>
            <p className="text-sm font-semibold">{formatCurrency(staffData.avgTicket)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Efficiency</p>
            <p className="text-sm font-semibold">{formatCurrency(staffData.efficiency)}/hr</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Retention</p>
            <p className="text-sm font-semibold">{staffData.retentionRate.toFixed(0)}%</p>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="mt-4 flex flex-wrap gap-2">
          {staffData.completionRate >= 90 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              High Reliability
            </span>
          )}
          {staffData.avgRating >= 4.5 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Top Rated
            </span>
          )}
          {staffData.efficiency > 100 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              High Efficiency
            </span>
          )}
          {staffData.retentionRate >= 60 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              Client Favorite
            </span>
          )}
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', 'year'].map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range 
                  ? 'bg-olive-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '7d' ? 'Week' : 
               range === '30d' ? 'Month' : 
               range === '90d' ? 'Quarter' : 'Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Team Overview */}
      {teamTotals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard 
            label="Total Revenue" 
            value={teamTotals.totalRevenue} 
            format="currency"
            icon={CurrencyDollarIcon}
          />
          <MetricCard 
            label="Total Bookings" 
            value={teamTotals.totalBookings} 
            icon={CalendarIcon}
          />
          <MetricCard 
            label="Average Rating" 
            value={teamTotals.avgRating} 
            format="rating"
            icon={StarIcon}
          />
          <MetricCard 
            label="Total Clients" 
            value={teamTotals.totalClients} 
            icon={UserGroupIcon}
          />
        </div>
      )}

      {/* Sort Controls */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Sort by:</span>
          <div className="flex space-x-2">
            {[
              { id: 'revenue', label: 'Revenue' },
              { id: 'bookings', label: 'Bookings' },
              { id: 'rating', label: 'Rating' },
              { id: 'efficiency', label: 'Efficiency' }
            ].map(option => (
              <button
                key={option.id}
                onClick={() => setSortBy(option.id)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === option.id 
                    ? 'bg-olive-100 text-olive-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Staff Performance Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sortedStaff.map(staffData => (
          <StaffPerformanceCard key={staffData.staffId} staffData={staffData} />
        ))}
      </div>

      {/* Empty State */}
      {sortedStaff.length === 0 && (
        <Card className="p-12 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Performance Data</h3>
          <p className="text-gray-600">
            Performance metrics will appear once staff members have completed appointments.
          </p>
        </Card>
      )}
    </div>
  )
}