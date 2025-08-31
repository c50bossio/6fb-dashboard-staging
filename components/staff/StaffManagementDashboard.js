'use client'

import {
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useCallback, useMemo, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { StaffHeader } from '@/components/layout/UnifiedDashboardHeader'
import Button from '@/components/ui/Button'
import { Card } from "@/components/ui/card.jsx"
import { useBusinessContext, useCurrentShopId } from '@/hooks/useBusinessContext'
import { 
  useStaffWithRealtime, 
  useCreateStaffMember, 
  useUpdateStaffMember, 
  useDeactivateStaffMember 
} from '@/hooks/useStaffQuery'
import { getDisplayName, nameMatches } from '@/lib/name-utils'
import { formatCurrency } from '@/lib/utils'
import PayrollDashboard from '../payroll/PayrollDashboard'
import AddStaffModal from './AddStaffModal'
import StaffAvailabilityEditor from './StaffAvailabilityEditor'
import StaffDetailModal from './StaffDetailModal'
import StaffPerformanceView from './StaffPerformanceView'

// React Query hooks

export default function StaffManagementDashboard() {
  // Get current shop ID and business context
  const barbershopId = useCurrentShopId()
  const { businessContext, isLoading: contextLoading, canManageStaff } = useBusinessContext()
  
  // Staff data with real-time updates
  const { 
    data: staff = [], 
    isLoading, 
    error, 
    refetch: refetchStaff 
  } = useStaffWithRealtime(barbershopId, {
    includeAvailability: false, // Not needed in dashboard, prevents 400 errors
    includeServices: false,     // Not needed in dashboard, prevents 400 errors
  })

  // Staff mutations
  const createStaffMutation = useCreateStaffMember()
  const updateStaffMutation = useUpdateStaffMember()
  const deactivateStaffMutation = useDeactivateStaffMember()
  
  const [activeView, setActiveView] = useState('overview') // overview, schedule, performance, payroll
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [addButtonLoading, setAddButtonLoading] = useState(false)
  const [editingAvailability, setEditingAvailability] = useState(null)
  
  // Ref to prevent multiple rapid clicks
  const addStaffTimeoutRef = useRef(null)

  // Calculate metrics from staff data
  const metrics = useMemo(() => {
    if (!staff || staff.length === 0) {
      return {
        totalStaff: 0,
        activeToday: 0,
        pendingPayroll: 0,
        avgRating: 0
      }
    }

    const totalStaff = staff.length
    const activeToday = staff.filter(s => s.is_active).length
    const pendingPayroll = staff.reduce((sum, s) => sum + (s.metrics?.pendingCommission || 0), 0)
    const avgRating = staff.reduce((sum, s) => sum + (s.metrics?.averageRating || 0), 0) / totalStaff || 0

    return {
      totalStaff,
      activeToday,
      pendingPayroll,
      avgRating
    }
  }, [staff])

  // Handle staff added - use React Query mutations
  const handleStaffAdded = useCallback(() => {
    // React Query will automatically refetch due to cache invalidation in the mutation
    toast.success('Staff member added successfully')
  }, [])

  // Handle Add Staff button click
  const handleAddStaffClick = useCallback(() => {
    setAddButtonLoading(true)
    setShowAddModal(true)
    
    // Auto-reset loading state after a delay to prevent stuck states
    addStaffTimeoutRef.current = setTimeout(() => {
      setAddButtonLoading(false)
    }, 500)
  }, [])

  // Filter staff based on search and status
  const filteredStaff = useMemo(() => {
    return staff.filter(member => {
      const matchesSearch = !searchQuery || 
        nameMatches({
          firstName: member.first_name,
          lastName: member.last_name,
          fullName: member.full_name,
          email: member.email
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
    const hasCommission = member.metrics?.pendingCommission > 0
    const isUpdating = updateStaffMutation.isPending || deactivateStaffMutation.isPending

    return (
      <Card className={`p-6 hover:shadow-lg transition-shadow cursor-pointer ${isUpdating ? 'opacity-50' : ''}`}
            onClick={() => !isUpdating && setSelectedStaff(member)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {/* Avatar */}
            <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
              <UserGroupIcon className="h-6 w-6 text-gray-600" />
            </div>
            
            {/* Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {/* Simple name display - use what we have */}
                {member.full_name || member.display_name || member.email || 'Unnamed Staff'}
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
            <p className="text-sm font-semibold text-gray-900">{member.metrics?.totalBookings || 0}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Revenue (30d)</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(member.metrics?.revenue || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Rating</p>
            <div className="flex items-center">
              <StarIcon className="h-3 w-3 text-yellow-400 mr-1" />
              <p className="text-sm font-semibold text-gray-900">
                {member.metrics?.rating > 0 ? member.metrics.rating.toFixed(1) : 'N/A'}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pending</p>
            <p className={`text-sm font-semibold ${hasCommission ? 'text-green-600' : 'text-gray-900'}`}>
              {formatCurrency(member.metrics?.pendingCommission || 0)}
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
                if (!isUpdating) {
                  setEditingAvailability(member)
                }
              }}
              disabled={isUpdating}
              className={`w-full mt-2 px-3 py-1.5 text-sm rounded-lg transition-colors duration-200 flex items-center justify-center ${
                isUpdating 
                  ? 'text-gray-500 bg-gray-100 cursor-not-allowed' 
                  : 'text-olive-700 bg-olive-50 hover:bg-olive-100'
              }`}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500 mr-2"></div>
                  Updating...
                </>
              ) : (
                'Edit Availability'
              )}
            </button>
          )}
        </div>
      </Card>
    )
  }

  // Show loading state while fetching context or staff data
  if (contextLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Staff</h3>
            <p className="text-gray-600 mb-4">There was an error loading your staff members.</p>
            <Button 
              onClick={() => refetchStaff()} 
              disabled={isLoading}
            >
              {isLoading ? 'Retrying...' : 'Try Again'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Check permissions
  if (!canManageStaff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md mx-4">
          <div className="text-center">
            <XCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-600">You don't have permission to manage staff members.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Unified Context Header */}
      <StaffHeader>
        <Button
          onClick={handleAddStaffClick}
          disabled={addButtonLoading || createStaffMutation.isPending}
          className="flex items-center"
        >
          {addButtonLoading || createStaffMutation.isPending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          ) : (
            <PlusIcon className="h-4 w-4 mr-2" />
          )}
          {createStaffMutation.isPending ? 'Adding...' : 'Add Staff'}
        </Button>
      </StaffHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
              disabled={addButtonLoading || createStaffMutation.isPending}
              className="flex items-center"
            >
              {addButtonLoading || createStaffMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {createStaffMutation.isPending ? 'Adding...' : 'Opening...'}
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
                  disabled={addButtonLoading || createStaffMutation.isPending}
                >
                  {addButtonLoading || createStaffMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {createStaffMutation.isPending ? 'Adding...' : 'Opening...'}
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
        <PayrollDashboard 
          staff={staff} 
          metrics={metrics} 
        />
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
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg relative">
            {updateStaffMutation.isPending && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-olive-600"></div>
                  <span className="text-olive-600 font-medium">Updating availability...</span>
                </div>
              </div>
            )}
            <StaffAvailabilityEditor
              staffMember={editingAvailability}
              currentAvailability={editingAvailability.metadata?.availability || editingAvailability.availability}
              onSave={async (availabilityData) => {
                try {
                  // Update staff availability using React Query mutation
                  await updateStaffMutation.mutateAsync({
                    staffId: editingAvailability.id || editingAvailability.user_id,
                    updates: {
                      availability: availabilityData,
                      metadata: {
                        ...editingAvailability.metadata,
                        availability: availabilityData
                      }
                    }
                  })
                  
                  setEditingAvailability(null)
                  
                } catch (error) {
                  console.error('Failed to update staff availability:', error)
                  // Error toast is handled by the mutation hook
                }
              }}
              onCancel={() => !updateStaffMutation.isPending && setEditingAvailability(null)}
            />
          </div>
        </div>
      )}

      {/* Staff Detail Modal */}
      {selectedStaff && (
        <StaffDetailModal
          staff={selectedStaff}
          onClose={() => !updateStaffMutation.isPending && setSelectedStaff(null)}
          isUpdating={updateStaffMutation.isPending}
          onUpdate={async (updatedStaff) => {
            // Validate updatedStaff data to prevent crashes
            if (!updatedStaff || typeof updatedStaff !== 'object') {
              toast.error('Invalid staff data received from server')
              return
            }
            
            // Ensure required fields exist
            if (!updatedStaff.id && !updatedStaff.user_id) {
              toast.error('Staff update failed - missing ID')
              return
            }
            
            // Use user_id as fallback if id is missing
            const staffId = updatedStaff.id || updatedStaff.user_id
            
            try {
              // Use React Query mutation for optimistic updates
              await updateStaffMutation.mutateAsync({
                staffId,
                updates: updatedStaff
              })
              
              // Close modal if staff was deactivated
              if (!updatedStaff.is_active) {
                setSelectedStaff(null)
              } else {
                // Update selected staff with new data
                setSelectedStaff(current => {
                  if (!current) return current
                  return {
                    ...current,
                    ...updatedStaff,
                    id: current.id || current.user_id // Preserve original ID
                  }
                })
              }
              
            } catch (error) {
              console.error('Staff update failed:', error)
              // Error toast is handled by the mutation hook
            }
          }}
        />
      )}
      
      </div>
    </div>
  )
}