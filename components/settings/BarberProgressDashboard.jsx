/**
 * BarberProgressDashboard Component
 * Shows all barbers' tier progress and commission performance
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Users, TrendingUp, DollarSign, Target, Award, Calendar } from 'lucide-react'
import financialService from '@/lib/financial-service'

export default function BarberProgressDashboard({ 
  barbershopId,
  tierStructures = [],
  arrangements = []
}) {
  const [barberProgress, setBarberProgress] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('current')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load barber progress data
  useEffect(() => {
    loadBarberProgress()
  }, [barbershopId, selectedPeriod])

  const loadBarberProgress = async () => {
    if (!barbershopId) return

    setLoading(true)
    setError(null)

    try {
      // Get all barbers using tier systems
      const tieredBarbers = arrangements.filter(arr => arr.use_tier_system)
      const progressData = []

      for (const arrangement of tieredBarbers) {
        try {
          // Get barber's tier status
          const tierStatus = await financialService.getBarberTierStatus(
            arrangement.barber_id,
            barbershopId
          )

          if (tierStatus.data) {
            progressData.push({
              ...arrangement,
              tierProgress: tierStatus.data
            })
          }
        } catch (error) {
          console.warn(`Error loading progress for barber ${arrangement.barber_id}:`, error)
        }
      }

      setBarberProgress(progressData)
    } catch (error) {
      console.error('Error loading barber progress:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getBarberInitials = (arrangement) => {
    // You might have barber name in arrangement or need to fetch it
    return arrangement.barber_name?.split(' ').map(n => n[0]).join('') || 'B'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const calculateProgressToNextTier = (progress) => {
    if (!progress?.nextTierThreshold || !progress?.projectedRevenue) return 0
    
    const currentRevenue = progress.current_period_revenue || 0
    const nextThreshold = progress.nextTierThreshold
    
    if (currentRevenue >= nextThreshold) return 100
    
    return Math.min(100, (currentRevenue / nextThreshold) * 100)
  }

  const getDaysRemainingText = (progress) => {
    if (!progress?.daysRemaining) return 'No data'
    
    const days = progress.daysRemaining
    if (days <= 0) return 'Period ended'
    if (days === 1) return '1 day left'
    return `${days} days left`
  }

  const getPerformanceIndicator = (progress) => {
    if (!progress?.isOnTrackForNextTier) return null
    
    return progress.isOnTrackForNextTier ? 'on-track' : 'behind'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading barber progress...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8 text-red-600">
          <p>Error loading progress data: {error}</p>
          <Button variant="outline" onClick={loadBarberProgress} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Barber Progress Dashboard
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current Period</SelectItem>
                  <SelectItem value="last">Last Period</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadBarberProgress}>
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      {barberProgress.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Barbers</p>
                  <p className="text-2xl font-bold">{barberProgress.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">On Track for Next Tier</p>
                  <p className="text-2xl font-bold text-green-600">
                    {barberProgress.filter(b => b.tierProgress?.isOnTrackForNextTier).length}
                  </p>
                </div>
                <Target className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      barberProgress.reduce((sum, b) => sum + (b.tierProgress?.current_period_revenue || 0), 0)
                    )}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Effective Rate</p>
                  <p className="text-2xl font-bold">
                    {barberProgress.length > 0 ? (
                      barberProgress.reduce((sum, b) => sum + (b.tierProgress?.effective_commission_rate || 0), 0) / barberProgress.length
                    ).toFixed(1) : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barber Progress Cards */}
      {barberProgress.length > 0 ? (
        <div className="space-y-4">
          {barberProgress.map((barber) => {
            const progress = barber.tierProgress
            const currentTier = progress?.current_tier
            const nextTierProgress = calculateProgressToNextTier(progress)
            const performanceIndicator = getPerformanceIndicator(progress)

            return (
              <Card key={barber.barber_id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-500 text-white font-bold">
                          {getBarberInitials(barber)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-lg">
                          {barber.barber_name || `Barber ${barber.barber_id.slice(-4)}`}
                        </p>
                        <p className="text-sm text-gray-600">
                          {barber.type} • {getDaysRemainingText(progress)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {currentTier && (
                        <Badge 
                          variant="default"
                          style={{ 
                            backgroundColor: currentTier.color_code + '20', 
                            color: currentTier.color_code,
                            borderColor: currentTier.color_code
                          }}
                        >
                          {currentTier.name} - {currentTier.commission_percentage}%
                        </Badge>
                      )}
                      {performanceIndicator && (
                        <div className="mt-2">
                          <Badge 
                            variant={performanceIndicator === 'on-track' ? 'default' : 'secondary'}
                            className={performanceIndicator === 'on-track' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                          >
                            {performanceIndicator === 'on-track' ? 'On Track' : 'Behind Pace'}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-sm text-green-700">Current Revenue</p>
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(progress?.current_period_revenue)}
                      </p>
                    </div>

                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-sm text-blue-700">Projected Total</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(progress?.projected_period_revenue)}
                      </p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-sm text-purple-700">Effective Rate</p>
                      <p className="text-xl font-bold text-purple-600">
                        {progress?.effective_commission_rate ? 
                          `${progress.effective_commission_rate.toFixed(1)}%` : 'N/A'
                        }
                      </p>
                    </div>

                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-sm text-orange-700">Bookings</p>
                      <p className="text-xl font-bold text-orange-600">
                        {progress?.current_period_bookings || 0}
                      </p>
                    </div>
                  </div>

                  {/* Progress to Next Tier */}
                  {progress?.nextTierThreshold && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm font-medium">
                          Progress to Next Tier
                          {progress.structure?.tiers && (
                            <span className="ml-2 text-gray-600">
                              ({progress.structure.tiers.find(t => t.min_revenue === progress.nextTierThreshold)?.name || 'Next Level'})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-600">
                          {formatCurrency(progress.current_period_revenue)} / {formatCurrency(progress.nextTierThreshold)}
                        </p>
                      </div>
                      <Progress value={nextTierProgress} className="h-2" />
                      <p className="text-xs text-gray-500">
                        {formatCurrency(Math.max(0, progress.nextTierThreshold - progress.current_period_revenue))} remaining
                      </p>
                    </div>
                  )}

                  {/* Tier Revenue Breakdown (for marginal calculation) */}
                  {progress?.tier_revenue_breakdown && Object.keys(progress.tier_revenue_breakdown).length > 0 && (
                    <div className="mt-4 p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium mb-2">Revenue by Tier</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(progress.tier_revenue_breakdown).map(([tierKey, amount]) => {
                          const tierLevel = parseInt(tierKey.split('_')[1])
                          const tier = progress.structure?.tiers?.find(t => t.tier_level === tierLevel)
                          return (
                            <div key={tierKey} className="text-center">
                              <p className="text-xs text-gray-600">{tier?.name || `Tier ${tierLevel}`}</p>
                              <p className="text-sm font-medium">{formatCurrency(amount)}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No barbers using tier system</p>
            <p className="text-sm text-gray-500">
              Configure barbers to use tier structures to see their progress here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Legend for marginal calculation */}
      {barberProgress.some(b => b.tierProgress?.structure?.calculation_method === 'marginal') && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Award className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">Marginal Tier System</p>
                <p className="text-gray-600">
                  Commission rates apply progressively to revenue brackets, similar to tax brackets. 
                  Higher tiers only apply to revenue above their thresholds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}