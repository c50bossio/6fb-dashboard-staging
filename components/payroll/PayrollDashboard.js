'use client'

import { 
  CurrencyDollarIcon, 
  ClockIcon, 
  UserGroupIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import {
  formatCommissionDisplay,
  formatBoothRent,
  formatFinancialModel,
  formatRentFrequency
} from '@/lib/financial-display-utils'
import financialService from '@/lib/financial-service'
import { getDisplayName } from '@/lib/name-utils'

// Utility function for currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0)
}

export default function PayrollDashboard({ staff = [], metrics = {}, barbershopId }) {
  const [loading, setLoading] = useState(false)
  const [tierData, setTierData] = useState({})
  const [tierStructure, setTierStructure] = useState(null)

  // Load tier data for staff members
  useEffect(() => {
    const loadTierData = async () => {
      if (!barbershopId || !staff.length) return
      
      try {
        // Load tier structure
        const { data: structure } = await financialService.getTierStructure(barbershopId)
        setTierStructure(structure)
        
        // Load tier status for each staff member
        const tierPromises = staff.map(async (member) => {
          try {
            const { data: tierStatus } = await financialService.getBarberTierStatus(member.id, barbershopId)
            return { memberId: member.id, tierStatus }
          } catch (error) {
            return { memberId: member.id, tierStatus: null }
          }
        })
        
        const tierResults = await Promise.all(tierPromises)
        const tierMap = {}
        
        tierResults.forEach(({ memberId, tierStatus }) => {
          tierMap[memberId] = tierStatus
        })
        
        setTierData(tierMap)
      } catch (error) {
        console.error('Error loading tier data:', error)
      }
    }

    loadTierData()
  }, [barbershopId, staff])

  // Calculate aggregate payroll metrics
  const boothRentDue = staff
    .filter(s => (s.arrangement_type || s.financial_model) === 'booth_rent' || (s.arrangement_type || s.financial_model) === 'hybrid')
    .reduce((sum, s) => sum + (s.booth_rent_amount || s.hybrid_base_rent || 0), 0)

  const staffCounts = {
    commission: staff.filter(s => (s.arrangement_type || s.financial_model) === 'commission').length,
    booth: staff.filter(s => (s.arrangement_type || s.financial_model) === 'booth_rent').length,
    hybrid: staff.filter(s => (s.arrangement_type || s.financial_model) === 'hybrid').length,
    tiered: Object.values(tierData).filter(tier => tier && tier.structure).length
  }

  // Calculate tier-related metrics
  const tierMetrics = {
    averageTierLevel: 0,
    totalTierRevenue: 0,
    topPerformers: [],
    tierUpgrades: 0
  }

  if (tierStructure && Object.keys(tierData).length > 0) {
    const activeTierUsers = Object.values(tierData).filter(tier => tier && tier.structure)
    
    if (activeTierUsers.length > 0) {
      // Average tier level
      tierMetrics.averageTierLevel = activeTierUsers.reduce((sum, tier) => 
        sum + (tier.current_tier?.tier_level || 1), 0
      ) / activeTierUsers.length

      // Total tier revenue this period
      tierMetrics.totalTierRevenue = activeTierUsers.reduce((sum, tier) => 
        sum + (tier.current_period_revenue || 0), 0
      )

      // Top performers (those on track for next tier)
      tierMetrics.topPerformers = activeTierUsers.filter(tier => 
        tier.isOnTrackForNextTier
      ).length
    }
  }

  const handleExportPayroll = () => {
    setLoading(true)
    // TODO: Implement actual export functionality
    setTimeout(() => {
      alert('Export feature coming soon')
      setLoading(false)
    }, 1000)
  }

  const handleProcessPayouts = () => {
    setLoading(true)
    // TODO: Implement actual payout processing
    setTimeout(() => {
      alert('Payout processing coming soon')
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pending Commissions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.pendingPayroll)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Booth Rent Due</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(boothRentDue)}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Staff Count</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{staff.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {staffCounts.commission} Commission | 
                {' '}{staffCounts.booth} Booth | 
                {' '}{staffCounts.hybrid} Hybrid
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        
        {/* Tier Performance Card */}
        <Card className="p-6 bg-gradient-to-br from-olive-50 to-olive-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-olive-600">Tier Performance</p>
              <p className="text-2xl font-bold text-olive-900 mt-1">
                {staffCounts.tiered}/{staff.length}
              </p>
              <p className="text-xs text-olive-600 mt-1">
                {staffCounts.tiered > 0 ? 
                  `Avg Level ${tierMetrics.averageTierLevel.toFixed(1)} | ${tierMetrics.topPerformers} on track` :
                  'No staff using tiers'
                }
              </p>
            </div>
            <TrophyIcon className="h-8 w-8 text-olive-500" />
          </div>
        </Card>
      </div>

      {/* Tier System Overview */}
      {tierStructure && staffCounts.tiered > 0 && (
        <Card className="p-6 border-2 border-olive-200 bg-olive-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-olive-900">
              {tierStructure.name}
            </h3>
            <div className="text-sm text-olive-600">
              Period Revenue: {formatCurrency(tierMetrics.totalTierRevenue)}
            </div>
          </div>
          
          <p className="text-sm text-olive-700 mb-4">{tierStructure.description}</p>
          
          {/* Tier Distribution */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              {tierStructure.tiers?.map((tier) => {
                const staffInTier = Object.values(tierData).filter(
                  td => td?.current_tier?.tier_level === tier.tier_level
                ).length
                
                return (
                  <div key={tier.id} className="text-center">
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold mb-1"
                      style={{ backgroundColor: tier.color_code }}
                    >
                      {staffInTier}
                    </div>
                    <div className="text-xs text-olive-600">{tier.name}</div>
                    <div className="text-xs text-olive-500">{tier.commission_percentage}%</div>
                  </div>
                )
              })}
            </div>
            
            <div className="text-right">
              <div className="text-sm text-olive-600">Reset Period</div>
              <div className="text-sm font-medium text-olive-900 capitalize">
                {tierStructure.reset_period}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Compensation Details Table */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Staff Compensation Details</h3>
          <button 
            onClick={() => window.location.href = '/dashboard/settings?tab=compensation'}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Configure Compensation →
          </button>
        </div>
        
        {staff.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No staff members configured</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Model / Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue (30d)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission/Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Progress / Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => {
                  const memberTierData = tierData[member.id]
                  const hasTierData = memberTierData && memberTierData.structure
                  
                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {getDisplayName({
                            firstName: member.user?.firstName || member.user?.first_name,
                            lastName: member.user?.lastName || member.user?.last_name,
                            fullName: member.user?.fullName || member.user?.full_name,
                            email: member.user?.email,
                            defaultName: 'Unnamed'
                          })}
                        </div>
                        <div className="text-sm text-gray-500">{member.role}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasTierData ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: memberTierData.current_tier?.color_code || '#6B7280' }}
                              />
                              <span className="text-sm font-medium text-olive-600">
                                {memberTierData.current_tier?.name || 'No Tier'} Tier
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {memberTierData.current_tier?.commission_percentage || 0}% Commission
                            </div>
                          </div>
                        ) : (
                          <div>
                            {(member.arrangement_type || member.financial_model) === 'commission' && (
                              <span className="text-sm text-blue-600">
                                {formatCommissionDisplay(member.commission_rate || 0.6)} Commission
                              </span>
                            )}
                            {(member.arrangement_type || member.financial_model) === 'booth_rent' && (
                              <span className="text-sm text-purple-600">
                                {formatFinancialModel('booth_rent')}
                              </span>
                            )}
                            {(member.arrangement_type || member.financial_model) === 'hybrid' && (
                              <span className="text-sm text-green-600">
                                {formatFinancialModel('hybrid')}
                              </span>
                            )}
                            {!(member.arrangement_type || member.financial_model) && (
                              <span className="text-sm text-gray-400">Not configured</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {hasTierData ? 
                            formatCurrency(memberTierData.current_period_revenue) :
                            formatCurrency(member.metrics?.revenue)
                          }
                        </div>
                        {hasTierData && (
                          <div className="text-xs text-gray-500">
                            {memberTierData.current_period_bookings} bookings this period
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {hasTierData ? (
                          <div>
                            <div className="text-green-600 font-medium">
                              Est. +{formatCurrency(
                                (memberTierData.current_period_revenue || 0) * 
                                ((memberTierData.current_tier?.commission_percentage || 0) / 100)
                              )}
                            </div>
                            {memberTierData.nextTierThreshold && (
                              <div className="text-xs text-olive-600">
                                {formatCurrency(memberTierData.nextTierThreshold - memberTierData.current_period_revenue)} to next tier
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            {(member.arrangement_type || member.financial_model) === 'commission' && (
                              <span className="text-green-600">
                                +{formatCurrency(member.metrics?.pendingCommission)}
                              </span>
                            )}
                            {(member.arrangement_type || member.financial_model) === 'booth_rent' && (
                              <span className="text-orange-600">
                                -{formatBoothRent(member.booth_rent_amount || 1500, member.rent_frequency)}
                              </span>
                            )}
                            {(member.arrangement_type || member.financial_model) === 'hybrid' && (
                              <span className="text-blue-600">
                                -{formatBoothRent(member.hybrid_base_rent || member.booth_rent_amount || 800, member.rent_frequency || 'monthly')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {hasTierData ? (
                          <div className="space-y-2">
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-olive-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, memberTierData.progressToNextTier || 0)}%` }}
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">
                                {Math.round(memberTierData.progressToNextTier || 0)}% to next
                              </span>
                              {memberTierData.isOnTrackForNextTier ? (
                                <span className="inline-flex items-center text-xs">
                                  <ArrowTrendingUpIcon className="h-3 w-3 text-green-500 mr-1" />
                                  <span className="text-green-600 font-medium">On Track</span>
                                </span>
                              ) : (
                                <span className="text-xs text-gray-500">Behind Pace</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            {member.metrics?.pendingCommission > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Current
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      
      {/* Quick Actions */}
      <div className="flex justify-end space-x-4">
        <Button 
          variant="outline" 
          onClick={handleExportPayroll}
          disabled={loading}
        >
          Export Payroll Report
        </Button>
        <Button 
          onClick={handleProcessPayouts}
          disabled={loading}
        >
          Process Payouts
        </Button>
      </div>
    </div>
  )
}