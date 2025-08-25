'use client'

import { 
  UserGroupIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronRightIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from "@/components/ui/card.jsx"
import Button from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import StaffScheduleView from './StaffScheduleView'
import StaffPerformanceView from './StaffPerformanceView'
import AddStaffModal from './AddStaffModal'

export default function StaffManagementDashboard() {
  const [activeView, setActiveView] = useState('overview') // overview, schedule, performance, payroll
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    activeToday: 0,
    pendingPayroll: 0,
    avgRating: 0
  })

  // Load staff data
  const loadStaffData = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      // Get user's barbershop
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get barbershop ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id, barbershop_id')
        .eq('id', user.id)
        .single()

      const barbershopId = profile?.shop_id || profile?.barbershop_id
      if (!barbershopId) return

      // Fetch staff data first (following CLAUDE.md - no PostgREST joins)
      const { data: staffData, error } = await supabase
        .from('barbershop_staff')
        .select('*')
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)

      if (error) {
        console.error('Error loading staff:', error)
        toast.error('Failed to load staff members')
        return
      }

      // Get user IDs from staff data
      const userIds = staffData?.map(s => s.user_id).filter(Boolean) || []
      
      // Fetch profiles separately (using profiles table, not users)
      let profiles = []
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
        
        profiles = profileData || []
      }

      // Fetch commission balances separately
      let commissionBalances = []
      if (userIds.length > 0) {
        const { data: balanceData } = await supabase
          .from('barber_commission_balances')
          .select('barber_id, pending_amount, total_earned')
          .in('barber_id', userIds)
        
        commissionBalances = balanceData || []
      }

      // Merge the data in JavaScript
      const mergedStaffData = (staffData || []).map(staff => {
        const profile = profiles.find(p => p.id === staff.user_id) || {}
        const balance = commissionBalances.find(b => b.barber_id === staff.user_id) || {}
        
        return {
          ...staff,
          user: profile,
          commission_balance: balance.pending_amount ? [balance] : []
        }
      })

      // Calculate metrics from appointments (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: appointments } = await supabase
        .from('appointments')
        .select('barber_id, status, rating, price')
        .eq('barbershop_id', barbershopId)
        .gte('appointment_date', thirtyDaysAgo.toISOString())

      // Process staff data with metrics
      const staffWithMetrics = (staffData || []).map(member => {
        const memberAppointments = appointments?.filter(a => a.barber_id === member.user_id) || []
        const completedAppointments = memberAppointments.filter(a => a.status === 'completed')
        const revenue = completedAppointments.reduce((sum, a) => sum + (a.price || 0), 0)
        const ratings = completedAppointments.filter(a => a.rating).map(a => a.rating)
        const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0

        return {
          ...member,
          metrics: {
            totalBookings: completedAppointments.length,
            revenue: revenue,
            rating: avgRating,
            pendingCommission: member.commission_balance?.[0]?.pending_amount || 0
          }
        }
      })

      setStaff(staffWithMetrics)

      // Calculate dashboard metrics
      const totalPendingPayroll = staffWithMetrics.reduce((sum, s) => 
        sum + (s.metrics.pendingCommission || 0), 0
      )
      const avgStaffRating = staffWithMetrics.filter(s => s.metrics.rating > 0)
        .reduce((sum, s, _, arr) => sum + s.metrics.rating / arr.length, 0)

      setMetrics({
        totalStaff: staffWithMetrics.length,
        activeToday: staffWithMetrics.filter(s => s.is_active).length, // TODO: Check actual schedule
        pendingPayroll: totalPendingPayroll,
        avgRating: avgStaffRating
      })

    } catch (error) {
      console.error('Error in loadStaffData:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaffData()
  }, [loadStaffData])

  // Filter staff based on search and status
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = !searchQuery || 
        member.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || 
        (filterStatus === 'active' && member.is_active) ||
        (filterStatus === 'inactive' && !member.is_active)
      
      return matchesSearch && matchesFilter
    })
  }, [staff, searchQuery, filterStatus])

  // Render metric cards
  const MetricCard = ({ icon: Icon, label, value, color = 'olive' }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`h-12 w-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </Card>
  )

  // Render staff card
  const StaffCard = ({ member }) => {
    const statusColor = member.is_active ? 'green' : 'gray'
    const hasCommission = member.metrics.pendingCommission > 0

    return (
      <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedStaff(member)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-gray-600" />
            </div>
            
            {/* Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {member.user?.full_name || member.user?.email || 'Unnamed Staff'}
              </h3>
              <p className="text-sm text-gray-600">{member.role || 'Barber'}</p>
              
              {/* Status badges */}
              <div className="flex items-center space-x-2 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                  {member.is_active ? 'Active' : 'Inactive'}
                </span>
                {member.financial_model && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {member.financial_model === 'commission' ? `${(member.commission_rate * 100).toFixed(0)}% Commission` : member.financial_model}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <ChevronRightIcon className="h-5 w-5 text-gray-400" />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Bookings (30d)</p>
            <p className="text-sm font-semibold text-gray-900">{member.metrics.totalBookings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenue (30d)</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(member.metrics.revenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rating</p>
            <div className="flex items-center">
              <StarIcon className="h-3 w-3 text-yellow-400 mr-1" />
              <p className="text-sm font-semibold text-gray-900">
                {member.metrics.rating > 0 ? member.metrics.rating.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className={`text-sm font-semibold ${hasCommission ? 'text-green-600' : 'text-gray-900'}`}>
              {formatCurrency(member.metrics.pendingCommission)}
            </p>
          </div>
        </div>

        {/* Quick Schedule Preview */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Today's Schedule:</span>
            <span className="text-gray-900 font-medium">9:00 AM - 6:00 PM</span>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
        <p className="text-gray-600 mt-2">Manage your team, schedules, and performance</p>
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: UserGroupIcon },
            { id: 'schedule', label: 'Schedule', icon: CalendarDaysIcon },
            { id: 'performance', label: 'Performance', icon: ChartBarIcon },
            { id: 'payroll', label: 'Payroll', icon: CurrencyDollarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                ${activeView === tab.id
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              <tab.icon className={`mr-2 h-5 w-5 ${activeView === tab.id ? 'text-olive-500' : 'text-gray-400'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* View Content */}
      {activeView === 'overview' && (
        <>
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MetricCard 
              icon={UserGroupIcon} 
              label="Total Staff" 
              value={metrics.totalStaff}
              color="olive"
            />
            <MetricCard 
              icon={CheckCircleIcon} 
              label="Active Today" 
              value={metrics.activeToday}
              color="green"
            />
            <MetricCard 
              icon={CurrencyDollarIcon} 
              label="Pending Payroll" 
              value={formatCurrency(metrics.pendingPayroll)}
              color="blue"
            />
            <MetricCard 
              icon={StarIcon} 
              label="Avg Rating" 
              value={metrics.avgRating > 0 ? metrics.avgRating.toFixed(1) : 'N/A'}
              color="yellow"
            />
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent w-full sm:w-64"
                />
              </div>

              {/* Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              >
                <option value="all">All Staff</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Add Staff Button */}
            <Button
              onClick={() => setShowAddModal(true)}
              className="flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Staff
            </Button>
          </div>

          {/* Staff Grid */}
          {filteredStaff.length === 0 ? (
            <Card className="p-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'No staff members match your search.' : 'Start by adding your first team member.'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  Add Your First Staff Member
                </Button>
              )}
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredStaff.map((member) => (
                <StaffCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </>
      )}

      {activeView === 'schedule' && (
        <StaffScheduleView staff={filteredStaff} onRefresh={loadStaffData} />
      )}

      {activeView === 'performance' && (
        <StaffPerformanceView staff={filteredStaff} />
      )}

      {activeView === 'payroll' && (
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Payroll & Commissions</h2>
          <p className="text-gray-600">Commission tracking and payroll export coming soon...</p>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            loadStaffData()
          }}
        />
      )}
    </div>
  )
}