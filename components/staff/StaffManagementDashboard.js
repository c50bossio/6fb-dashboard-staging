'use client'

import { 
  UserGroupIcon,
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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { toast } from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Card } from "@/components/ui/card.jsx"
import { getDisplayName, nameMatches } from '@/lib/name-utils'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import unifiedStaffService from '@/lib/unified-staff-service'
import PayrollDashboard from '../payroll/PayrollDashboard'
import AddStaffModal from './AddStaffModal'
import StaffAvailabilityEditor from './StaffAvailabilityEditor'
import StaffDetailModal from './StaffDetailModal'
import StaffPerformanceView from './StaffPerformanceView'

export default function StaffManagementDashboard() {
  const [activeView, setActiveView] = useState('overview') // overview, schedule, performance, payroll
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [addButtonLoading, setAddButtonLoading] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(null)
  const [metrics, setMetrics] = useState({
    totalStaff: 0,
    activeToday: 0,
    pendingPayroll: 0,
    avgRating: 0
  })
  
  // Ref to prevent multiple rapid clicks
  const addStaffTimeoutRef = useRef(null)

  // Load staff data
  const loadStaffData = useCallback(async () => {
    try {
      setLoading(true)
      console.log('📋 StaffManagementDashboard: Loading staff data...')
      
      // Use unified staff service to get comprehensive staff data
      const staffData = await unifiedStaffService.getStaff(null, {
        useCache: true,
        includeAvailability: true,
        includeServices: true,
        forceRefresh: false
      })
      
      if (staffData.staff && staffData.staff.length > 0) {
        console.log(`✅ StaffManagementDashboard: Loaded ${staffData.staff.length} staff members via ${staffData.source} endpoint`)
        
        // The unified staff service already provides enhanced staff data
        setStaff(staffData.staff)
        
        // Calculate metrics from the enhanced staff data
        const totalStaff = staffData.staff.length
        const activeToday = staffData.staff.filter(s => s.is_active).length
        const pendingPayroll = staffData.staff.reduce((sum, s) => sum + (s.metrics?.pendingCommission || 0), 0)
        const avgRating = staffData.staff.reduce((sum, s) => sum + (s.metrics?.averageRating || 0), 0) / totalStaff || 0
        
        setMetrics({
          totalStaff,
          activeToday,
          pendingPayroll,
          avgRating
        })
        
        console.log(`📊 Staff metrics: ${totalStaff} total, ${activeToday} active, $${pendingPayroll.toFixed(2)} pending payroll`)
      } else {
        console.log('⚠️ StaffManagementDashboard: No staff data found')
        setStaff([])
        setMetrics({
          totalStaff: 0,
          activeToday: 0,
          pendingPayroll: 0,
          avgRating: 0
        })
      }
      
    } catch (error) {
      console.error('❌ StaffManagementDashboard: Error loading staff:', error)
      toast.error('Failed to load staff members')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaffData()
  }, [loadStaffData])

  // Handle staff added - refresh data and invalidate cache
  const handleStaffAdded = useCallback(() => {
    console.log('🎉 Staff member added, refreshing data...')
    unifiedStaffService.invalidateCache()
    loadStaffData()
  }, [loadStaffData])

  // Filter staff based on search and status
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = !searchQuery || 
        nameMatches({
          firstName: member.user?.firstName || member.user?.first_name,
          lastName: member.user?.lastName || member.user?.last_name,
          fullName: member.user?.fullName || member.user?.full_name,
          email: member.user?.email
        }, searchQuery) ||
        (member.invitedName && member.invitedName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.invitedEmail && member.invitedEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.metadata?.invited_name && member.metadata.invited_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (member.metadata?.invited_email && member.metadata.invited_email.toLowerCase().includes(searchQuery.toLowerCase()))
      
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
                {(() => {
                  // Use name utilities for consistent display
                  const displayName = getDisplayName({
                    firstName: member.user?.firstName || member.user?.first_name,
                    lastName: member.user?.lastName || member.user?.last_name,
                    fullName: member.user?.fullName || member.user?.full_name,
                    email: member.user?.email,
                    defaultName: null
                  })
                  
                  // If we got a name from the user data, return it
                  if (displayName && displayName !== 'Unknown User') {
                    return displayName
                  }
                  
                  // Fall back to invitation data
                  if (member.invitedName) return `${member.invitedName} (Invited)`
                  if (member.invitedEmail) return `${member.invitedEmail} (Invited)`
                  if (member.metadata?.invited_name) return `${member.metadata.invited_name} (Invited)`
                  if (member.metadata?.invited_email) return `${member.metadata.invited_email} (Invited)`
                  return 'Unnamed Staff'
                })()}
              </h3>
              <p className="text-sm text-gray-600">
                {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1).toLowerCase() : 'Barber'}
              </p>
              
              {/* Status badges */}
              <div className="flex items-center space-x-2 mt-2">
                {member.isPendingInvitation ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pending Invitation
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-${statusColor}-100 text-${statusColor}-800`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                )}
                {member.financial_model && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {member.financial_model === 'commission' ? `${(member.commission_rate * 100).toFixed(0)}% Commission` : member.financial_model}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compensation Model Badge */}
          {member.financial_model && (
            <div className="ml-auto mr-2">
              {member.financial_model === 'commission' && (
                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                  {(member.commission_rate * 100).toFixed(0)}% Commission
                </span>
              )}
              {member.financial_model === 'booth_rent' && (
                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                  Booth Rent
                </span>
              )}
              {member.financial_model === 'hybrid' && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Hybrid
                </span>
              )}
            </div>
          )}
          
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
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Today's Schedule:</span>
            <span className="text-gray-900 font-medium">
              {(() => {
                // For pending invitations, show as not set
                if (member.isPendingInvitation) {
                  return <span className="text-gray-500 italic">Pending Setup</span>
                }
                
                // Check if they have availability configuration
                const availability = member.metadata?.availability || member.availability
                const today = new Date()
                const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                const todayName = dayNames[today.getDay()]
                
                // If we have proper availability data
                if (availability?.regularHours?.[todayName]) {
                  const todaySchedule = availability.regularHours[todayName]
                  if (!todaySchedule.isWorking) {
                    return <span className="text-gray-500">Day Off</span>
                  }
                  
                  const formatTime = (time) => {
                    const [hour, minute] = time.split(':')
                    const hourNum = parseInt(hour)
                    const ampm = hourNum >= 12 ? 'PM' : 'AM'
                    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
                    return `${displayHour}:${minute} ${ampm}`
                  }
                  
                  return `${formatTime(todaySchedule.start)} - ${formatTime(todaySchedule.end)}`
                }
                
                // Fallback to simple schedule data if exists
                const startTime = member.metadata?.preferred_start_time
                const endTime = member.metadata?.preferred_end_time
                
                if (startTime && endTime) {
                  const formatTime = (time) => {
                    const [hour, minute] = time.split(':')
                    const hourNum = parseInt(hour)
                    const ampm = hourNum >= 12 ? 'PM' : 'AM'
                    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
                    return `${displayHour}:${minute} ${ampm}`
                  }
                  return `${formatTime(startTime)} - ${formatTime(endTime)}`
                }
                
                // No schedule data available
                return <span className="text-gray-500 italic">Schedule not set</span>
              })()}
            </span>
          </div>
          
          {/* Edit Schedule Button */}
          {!member.isPendingInvitation && (
            <button
              onClick={(e) => {
                e.stopPropagation() // Prevent card click event
                setEditingAvailability(member)
              }}
              className="w-full mt-2 px-3 py-1.5 text-sm text-olive-700 bg-olive-50 hover:bg-olive-100 rounded-lg transition-colors duration-200"
            >
              Edit Availability
            </button>
          )}
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
              onClick={handleAddStaffClick}
              disabled={addButtonLoading}
              className="flex items-center"
            >
              {addButtonLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Opening...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Staff
                </>
              )}
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
                <Button 
                  onClick={handleAddStaffClick}
                  disabled={addButtonLoading}
                >
                  {addButtonLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Opening...
                    </>
                  ) : (
                    'Add Your First Staff Member'
                  )}
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

      {activeView === 'performance' && (
        <StaffPerformanceView staff={filteredStaff} />
      )}

      {activeView === 'payroll' && (
        <PayrollDashboard staff={staff} metrics={metrics} />
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          onClose={() => {
            setShowAddModal(false)
            setAddButtonLoading(false)
            if (addStaffTimeoutRef.current) {
              clearTimeout(addStaffTimeoutRef.current)
            }
          }}
          onSuccess={() => {
            setShowAddModal(false)
            setAddButtonLoading(false)
            if (addStaffTimeoutRef.current) {
              clearTimeout(addStaffTimeoutRef.current)
            }
            handleStaffAdded()
          }}
        />
      )}
      
      {/* Edit Availability Modal */}
      {editingAvailability && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg">
            <StaffAvailabilityEditor
              staffMember={editingAvailability}
              currentAvailability={editingAvailability.metadata?.availability || editingAvailability.availability}
              onSave={() => {
                setEditingAvailability(null)
                loadStaffData()
              }}
              onCancel={() => setEditingAvailability(null)}
            />
          </div>
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <StaffDetailModal
          staff={selectedStaff}
          onClose={() => setSelectedStaff(null)}
          onUpdate={(updatedStaff) => {
            console.log('📝 [DASHBOARD] onUpdate received:', updatedStaff)
            
            // Validate updatedStaff data to prevent crashes
            if (!updatedStaff || typeof updatedStaff !== 'object') {
              console.error('❌ [DASHBOARD] Invalid updatedStaff data received:', updatedStaff)
              toast.error('Invalid staff data received from server')
              return
            }
            
            // Ensure required fields exist
            if (!updatedStaff.id && !updatedStaff.user_id) {
              console.error('❌ [DASHBOARD] Missing required ID fields:', updatedStaff)
              toast.error('Staff update failed - missing ID')
              return
            }
            
            // Use user_id as fallback if id is missing
            const staffId = updatedStaff.id || updatedStaff.user_id
            
            // Update the staff member in the list
            setStaff(prevStaff => 
              prevStaff.map(member => {
                const currentId = member.id || member.user_id
                return currentId === staffId 
                  ? { ...member, ...updatedStaff, id: currentId } // Preserve the ID
                  : member
              })
            )
            
            console.log('✅ [DASHBOARD] Staff list updated successfully')
            
            // Note: Removed loadStaffData() call to prevent race condition
            // The local state update above is sufficient since we have fresh API data
            // Close modal if staff was deactivated
            if (!updatedStaff.is_active) {
              setSelectedStaff(null)
            } else {
              // Update selected staff with new data - with validation
              setSelectedStaff(current => {
                if (!current) return current
                return {
                  ...current,
                  ...updatedStaff,
                  id: current.id || current.user_id // Preserve original ID
                }
              })
            }
          }}
        />
      )}
    </div>
  )
}