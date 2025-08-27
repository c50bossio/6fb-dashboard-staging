'use client'

import { 
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import financialService from '@/lib/financial-service'

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const calculateDaysRemaining = (endDate) => {
  const now = new Date()
  const end = new Date(endDate)
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
}

export default function TierAssignmentManager({ 
  barbershopId, 
  staff = [], 
  onAssignmentChange 
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tierStructures, setTierStructures] = useState([])
  const [assignments, setAssignments] = useState({})
  const [errors, setErrors] = useState({})
  
  // Load tier structures and current assignments
  const loadData = useCallback(async () => {
    if (!barbershopId) return
    
    try {
      setLoading(true)
      
      // Load tier structures
      const { data: structures, error: structuresError } = await financialService.getTierStructure(barbershopId)
      if (structuresError) {
        console.error('Error loading tier structures:', structuresError)
        setTierStructures([])
      } else {
        setTierStructures(structures ? [structures] : [])
      }
      
      // Load current assignments for each staff member
      const assignmentPromises = staff.map(async (member) => {
        try {
          const { data: status } = await financialService.getBarberTierStatus(member.id, barbershopId)
          return { barberId: member.id, status }
        } catch (error) {
          console.error(`Error loading tier status for ${member.id}:`, error)
          return { barberId: member.id, status: null }
        }
      })
      
      const assignmentResults = await Promise.all(assignmentPromises)
      const assignmentMap = {}
      
      assignmentResults.forEach(({ barberId, status }) => {
        assignmentMap[barberId] = status
      })
      
      setAssignments(assignmentMap)
      
    } catch (error) {
      console.error('Error loading tier assignment data:', error)
      setErrors({ load: error.message })
    } finally {
      setLoading(false)
    }
  }, [barbershopId, staff])
  
  useEffect(() => {
    loadData()
  }, [loadData])
  
  // Assign barber to tier structure
  const assignBarberToTiers = async (barberId, structureId) => {
    setSaving(true)
    setErrors({})
    
    try {
      if (!structureId) {
        throw new Error('Please select a tier structure')
      }
      
      const { data, error } = await financialService.assignBarberToTierStructure(
        barberId, 
        barbershopId, 
        structureId
      )
      
      if (error) {
        throw new Error(error)
      }
      
      // Refresh assignments
      await loadData()
      
      if (onAssignmentChange) {
        onAssignmentChange({ barberId, structureId, assignment: data })
      }
      
    } catch (error) {
      console.error('Error assigning barber to tier structure:', error)
      setErrors({ [barberId]: error.message })
    } finally {
      setSaving(false)
    }
  }
  
  // Remove barber from tier system
  const removeBarberFromTiers = async (barberId) => {
    setSaving(true)
    
    try {
      // Update financial arrangement to disable tier system
      // This would need to be implemented in the financial service
      console.log('Removing barber from tier system:', barberId)
      
      // Refresh data
      await loadData()
      
    } catch (error) {
      console.error('Error removing barber from tiers:', error)
      setErrors({ [barberId]: error.message })
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }
  
  if (tierStructures.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Tier Structures</h3>
          <p className="mt-1 text-sm text-gray-500">
            Create a tier structure first to assign barbers to performance tiers.
          </p>
        </div>
      </Card>
    )
  }
  
  const activeStructure = tierStructures[0] // Using the first/default structure
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tier Assignments</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage which barbers use progressive commission tiers
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={loadData}
          disabled={loading}
        >
          Refresh Status
        </Button>
      </div>
      
      {/* Tier Structure Info */}
      <Card className="p-6 bg-olive-50 border-olive-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-medium text-olive-900">{activeStructure.name}</h3>
            <p className="text-sm text-olive-700 mt-1">{activeStructure.description}</p>
            
            <div className="mt-3 flex items-center space-x-6 text-sm text-olive-600">
              <div className="flex items-center">
                <ClockIcon className="h-4 w-4 mr-1" />
                Resets {activeStructure.reset_period}
              </div>
              <div className="flex items-center">
                <ChartBarIcon className="h-4 w-4 mr-1" />
                {activeStructure.tiers?.length || 0} tiers
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-olive-600 mb-2">Commission Range</div>
            <div className="text-lg font-semibold text-olive-900">
              {Math.min(...(activeStructure.tiers?.map(t => t.commission_percentage) || [0]))}% - 
              {Math.max(...(activeStructure.tiers?.map(t => t.commission_percentage) || [0]))}%
            </div>
          </div>
        </div>
        
        {/* Tier Preview */}
        <div className="mt-4 flex flex-wrap gap-2">
          {activeStructure.tiers?.map((tier, index) => (
            <div 
              key={tier.id}
              className="flex items-center space-x-2 px-3 py-1 bg-white rounded-full border border-olive-200"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tier.color_code }}
              />
              <span className="text-xs font-medium text-olive-800">
                {tier.name}: {tier.commission_percentage}%
              </span>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Staff Assignments */}
      <div className="space-y-4">
        {staff.map((member) => {
          const assignment = assignments[member.id]
          const hasAssignment = assignment && assignment.structure
          const hasError = errors[member.id]
          
          return (
            <Card key={member.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  
                  {/* Barber Info */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {member.user?.full_name || member.user?.email || 'Unknown'}
                    </h3>
                    <p className="text-sm text-gray-500">{member.role}</p>
                    
                    {hasAssignment && (
                      <div className="flex items-center space-x-4 mt-2 text-sm">
                        <div className="flex items-center text-green-600">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Using tier system
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: assignment.current_tier?.color_code || '#6B7280' }}
                          />
                          <span className="text-gray-700">
                            {assignment.current_tier?.name || 'No tier'} - {assignment.current_tier?.commission_percentage || 0}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!hasAssignment && (
                      <div className="flex items-center text-gray-500 mt-2 text-sm">
                        <XCircleIcon className="h-4 w-4 mr-1" />
                        Not using tier system
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {!hasAssignment ? (
                    <Button
                      onClick={() => assignBarberToTiers(member.id, activeStructure.id)}
                      disabled={saving}
                      className="bg-olive-600 hover:bg-olive-700"
                    >
                      {saving ? 'Assigning...' : 'Enable Tiers'}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => removeBarberFromTiers(member.id)}
                      disabled={saving}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Disable Tiers
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Assignment Details */}
              {hasAssignment && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Current Period</div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(assignment.current_period_start)} - {formatDate(assignment.current_period_end)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {calculateDaysRemaining(assignment.current_period_end)} days remaining
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Period Revenue</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(assignment.current_period_revenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {assignment.current_period_bookings} bookings
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Progress to Next Tier</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                        <div 
                          className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, assignment.progressToNextTier || 0)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500">
                        {assignment.nextTierThreshold ? 
                          `${formatCurrency(assignment.current_period_revenue)} / ${formatCurrency(assignment.nextTierThreshold)}` :
                          'Highest tier achieved'
                        }
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Projected Revenue</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {formatCurrency(assignment.projectedEndRevenue)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {assignment.isOnTrackForNextTier ? (
                          <span className="text-green-600">On track for next tier</span>
                        ) : (
                          <span className="text-gray-500">Behind pace for next tier</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Tier Timeline */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>Tier Progress</span>
                      <span>{Math.round(assignment.progressToNextTier || 0)}%</span>
                    </div>
                    
                    <div className="flex space-x-1">
                      {activeStructure.tiers?.map((tier, index) => {
                        const isActive = assignment.current_tier?.tier_level >= tier.tier_level
                        const isCurrent = assignment.current_tier?.tier_level === tier.tier_level
                        
                        return (
                          <div
                            key={tier.id}
                            className={`flex-1 h-2 rounded-sm ${
                              isActive 
                                ? isCurrent 
                                  ? 'bg-olive-600' 
                                  : 'bg-olive-400'
                                : 'bg-gray-200'
                            }`}
                            title={`${tier.name}: ${tier.commission_percentage}%`}
                          />
                        )
                      })}
                    </div>
                    
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      {activeStructure.tiers?.map((tier) => (
                        <span key={tier.id} className="text-center">
                          {tier.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error Message */}
              {hasError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{hasError}</p>
                </div>
              )}
            </Card>
          )
        })}
      </div>
      
      {staff.length === 0 && (
        <Card className="p-6">
          <div className="text-center">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Staff Members</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add staff members to assign them to commission tiers.
            </p>
          </div>
        </Card>
      )}
      
      {/* Summary */}
      {staff.length > 0 && (
        <Card className="p-6 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Assignment Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-600">
                {Object.values(assignments).filter(a => a && a.structure).length}
              </div>
              <div className="text-sm text-gray-500">Using Tiers</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {staff.length - Object.values(assignments).filter(a => a && a.structure).length}
              </div>
              <div className="text-sm text-gray-500">Standard Commission</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {staff.length}
              </div>
              <div className="text-sm text-gray-500">Total Staff</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}