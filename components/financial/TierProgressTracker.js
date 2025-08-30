'use client'

import { 
  ChartBarIcon,
  TrophyIcon,
  CalendarIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo } from 'react'
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
    day: 'numeric'
  })
}

const calculateForecast = (assignment, daysRemaining) => {
  if (!assignment || daysRemaining <= 0) return null
  
  const dailyAvg = assignment.daily_avg_revenue || 0
  const projectedTotal = assignment.current_period_revenue + (dailyAvg * daysRemaining)
  
  return {
    projectedTotal,
    dailyRequired: assignment.nextTierThreshold ? 
      Math.max(0, (assignment.nextTierThreshold - assignment.current_period_revenue) / daysRemaining) : 0,
    probabilityOfNextTier: assignment.nextTierThreshold ? 
      Math.min(100, (projectedTotal / assignment.nextTierThreshold) * 100) : 100
  }
}

const getTierColor = (tier) => {
  return tier?.color_code || '#6B7280'
}

export default function TierProgressTracker({ barberId, barbershopId }) {
  const [loading, setLoading] = useState(true)
  const [tierStatus, setTierStatus] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Load tier status
  const loadTierStatus = async () => {
    if (!barberId || !barbershopId) return
    
    try {
      setRefreshing(true)
      const { data, error: loadError } = await financialService.getBarberTierStatus(barberId, barbershopId)
      
      if (loadError) {
        throw new Error(loadError)
      }
      
      setTierStatus(data)
      setError(null)
    } catch (err) {
      console.error('Error loading tier status:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }
  
  useEffect(() => {
    loadTierStatus()
    
    // Refresh every 5 minutes
    const interval = setInterval(loadTierStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [barberId, barbershopId])
  
  // Calculate forecast and progress metrics
  const progressMetrics = useMemo(() => {
    if (!tierStatus) return null
    
    const daysRemaining = tierStatus.daysRemaining || 0
    const daysInPeriod = tierStatus.daysInPeriod || 30
    const daysPassed = daysInPeriod - daysRemaining
    
    const forecast = calculateForecast(tierStatus, daysRemaining)
    
    // Performance indicators
    const expectedRevenue = (tierStatus.current_period_revenue / Math.max(1, daysPassed)) * daysInPeriod
    const performanceRatio = expectedRevenue > 0 ? (tierStatus.current_period_revenue / (expectedRevenue * (daysPassed / daysInPeriod))) : 1
    
    return {
      daysRemaining,
      daysPassed,
      daysInPeriod,
      forecast,
      performanceRatio,
      isAheadOfPace: performanceRatio > 1.05,
      isBehindPace: performanceRatio < 0.95,
      onTrackForCurrent: true,
      percentThroughPeriod: (daysPassed / daysInPeriod) * 100
    }
  }, [tierStatus])
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </Card>
    )
  }
  
  if (error || !tierStatus) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-red-900">Failed to Load Tier Status</h3>
          <p className="mt-1 text-sm text-red-600">{error || 'No tier assignment found'}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => {
              setError(null)
              setLoading(true)
              loadTierStatus()
            }}
          >
            Try Again
          </Button>
        </div>
      </Card>
    )
  }
  
  const currentTier = tierStatus.current_tier
  const nextTier = tierStatus.structure?.tiers?.find(
    t => t.tier_level === (currentTier?.tier_level || 0) + 1
  )
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Tier Progress Tracking</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time performance tracking and forecasting
          </p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={loadTierStatus}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      {/* Current Status */}
      <Card className="p-6" style={{ borderLeft: `4px solid ${getTierColor(currentTier)}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: getTierColor(currentTier) }}
            >
              <TrophyIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {currentTier?.name || 'No Tier'} Tier
              </h3>
              <p className="text-sm text-gray-500">
                {currentTier?.commission_percentage || 0}% Commission Rate
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(tierStatus.current_period_revenue)}
            </div>
            <div className="text-sm text-gray-500">
              {tierStatus.current_period_bookings} bookings
            </div>
          </div>
        </div>
        
        {/* Progress to Next Tier */}
        {nextTier && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Progress to {nextTier.name} Tier
              </span>
              <span className="text-sm text-gray-500">
                {formatCurrency(tierStatus.current_period_revenue)} / {formatCurrency(nextTier.threshold_amount)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="h-3 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, tierStatus.progressToNextTier || 0)}%`,
                  backgroundColor: getTierColor(nextTier)
                }}
              />
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {Math.round(tierStatus.progressToNextTier || 0)}% Complete
              </span>
              <span className="font-medium" style={{ color: getTierColor(nextTier) }}>
                {formatCurrency(nextTier.threshold_amount - tierStatus.current_period_revenue)} remaining
              </span>
            </div>
          </div>
        )}
        
        {!nextTier && (
          <div className="text-center py-4">
            <CheckCircleIcon className="mx-auto h-8 w-8 text-green-500 mb-2" />
            <p className="text-sm font-medium text-green-600">Highest tier achieved!</p>
          </div>
        )}
      </Card>
      
      {/* Period Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Period Timeline</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDate(tierStatus.current_period_start)} - {formatDate(tierStatus.current_period_end)}
              </p>
            </div>
            <CalendarIcon className="h-6 w-6 text-gray-400" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className="text-lg font-semibold text-gray-900">
                {progressMetrics?.daysRemaining || 0}
              </p>
              <p className="text-xs text-gray-500">
                {Math.round(progressMetrics?.percentThroughPeriod || 0)}% through period
              </p>
            </div>
            <ClockIcon className="h-6 w-6 text-gray-400" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Daily Average</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(tierStatus.daily_avg_revenue || 0)}
              </p>
              {progressMetrics?.isAheadOfPace && (
                <p className="text-xs text-green-600 flex items-center">
                  <ChartBarIcon className="h-3 w-3 mr-1" />
                  Ahead of pace
                </p>
              )}
              {progressMetrics?.isBehindPace && (
                <p className="text-xs text-red-600 flex items-center">
                  <ArrowTrendingDownIcon className="h-3 w-3 mr-1" />
                  Behind pace
                </p>
              )}
            </div>
            <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
          </div>
        </Card>
      </div>
      
      {/* Forecasting */}
      {progressMetrics?.forecast && nextTier && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2" />
            Revenue Forecasting
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Projected End-of-Period Revenue</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(progressMetrics.forecast.projectedTotal)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-blue-500"
                      style={{ 
                        width: `${Math.min(100, (progressMetrics.forecast.projectedTotal / (nextTier.threshold_amount * 1.2)) * 100)}%`
                      }}
                    />
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Next Tier Probability</span>
                    <span className={`text-sm font-medium ${
                      progressMetrics.forecast.probabilityOfNextTier >= 80 ? 'text-green-600' :
                      progressMetrics.forecast.probabilityOfNextTier >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(progressMetrics.forecast.probabilityOfNextTier)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        progressMetrics.forecast.probabilityOfNextTier >= 80 ? 'bg-green-500' :
                        progressMetrics.forecast.probabilityOfNextTier >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${progressMetrics.forecast.probabilityOfNextTier}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Daily Target Analysis</h4>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current daily average:</span>
                    <span className="font-medium">{formatCurrency(tierStatus.daily_avg_revenue || 0)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Required for next tier:</span>
                    <span className="font-medium text-olive-600">
                      {formatCurrency(progressMetrics.forecast.dailyRequired)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gap per day:</span>
                    <span className={`font-medium ${
                      progressMetrics.forecast.dailyRequired > (tierStatus.daily_avg_revenue || 0) 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {progressMetrics.forecast.dailyRequired > (tierStatus.daily_avg_revenue || 0) 
                        ? `+${formatCurrency(progressMetrics.forecast.dailyRequired - (tierStatus.daily_avg_revenue || 0))}`
                        : `${formatCurrency((tierStatus.daily_avg_revenue || 0) - progressMetrics.forecast.dailyRequired)} ahead`
                      }
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Recommendations */}
              <div className="bg-olive-50 p-4 rounded-lg border border-olive-200">
                <h4 className="font-medium text-olive-900 mb-2">Performance Recommendations</h4>
                <div className="space-y-1 text-sm text-olive-700">
                  {progressMetrics.forecast.probabilityOfNextTier >= 80 && (
                    <p>✅ You're on track! Maintain current performance to reach {nextTier.name} tier.</p>
                  )}
                  {progressMetrics.forecast.probabilityOfNextTier < 80 && progressMetrics.forecast.probabilityOfNextTier >= 50 && (
                    <p>⚠️ Increase daily revenue by {formatCurrency(progressMetrics.forecast.dailyRequired - (tierStatus.daily_avg_revenue || 0))} to reach next tier.</p>
                  )}
                  {progressMetrics.forecast.probabilityOfNextTier < 50 && (
                    <p>🎯 Focus on booking premium services to reach the {formatCurrency(progressMetrics.forecast.dailyRequired)} daily target.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Tier Structure Overview */}
      {tierStatus.structure?.tiers && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {tierStatus.structure.name} - All Tiers
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tierStatus.structure.tiers.map((tier) => {
              const isCurrentTier = currentTier?.tier_level === tier.tier_level
              const isAchieved = (currentTier?.tier_level || 0) >= tier.tier_level
              const isNextTier = nextTier?.tier_level === tier.tier_level
              
              return (
                <div 
                  key={tier.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentTier 
                      ? 'border-olive-500 bg-olive-50' 
                      : isNextTier 
                        ? 'border-blue-300 bg-blue-50'
                        : isAchieved 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div 
                      className="w-6 h-6 rounded-full"
                      style={{ backgroundColor: tier.color_code }}
                    />
                    {isCurrentTier && <CheckCircleIcon className="h-5 w-5 text-olive-600" />}
                    {isAchieved && !isCurrentTier && <CheckCircleIcon className="h-5 w-5 text-green-600" />}
                  </div>
                  
                  <h4 className="font-semibold text-gray-900">{tier.name}</h4>
                  <p className="text-sm text-gray-600 mb-1">
                    {tier.commission_percentage}% Commission
                  </p>
                  <p className="text-xs text-gray-500">
                    {tier.threshold_amount > 0 
                      ? `${formatCurrency(tier.threshold_amount)}+ required`
                      : 'Starting tier'
                    }
                  </p>
                  
                  {isNextTier && (
                    <div className="mt-2 text-xs text-blue-600 font-medium">
                      Next Target
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}