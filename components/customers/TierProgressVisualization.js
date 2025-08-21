'use client'

import React, { useState, useEffect } from 'react'
import { 
  Trophy, 
  Medal, 
  Crown, 
  Star,
  ArrowRight,
  Target,
  Sparkles,
  TrendingUp,
  Gift,
  Zap
} from 'lucide-react'
import { Badge } from '../ui/badge'

/**
 * TierProgressVisualization Component
 * 
 * A beautiful visual representation of customer tier progress
 * Shows current tier, progress to next tier, tier benefits, and visual path
 */
export default function TierProgressVisualization({ 
  customerId, 
  barbershopId, 
  programId = null,
  showBenefits = true,
  showRoadmap = true,
  variant = 'full' // 'full', 'compact', 'minimal'
}) {
  const [tierData, setTierData] = useState(null)
  const [allTiers, setAllTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch tier data
  const fetchTierData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.authenticated) {
        throw new Error('Authentication required')
      }

      // Fetch customer points and tier info
      const balanceUrl = new URL('/api/customers/loyalty/points', window.location.origin)
      balanceUrl.searchParams.set('customer_id', customerId)
      balanceUrl.searchParams.set('action', 'balance')
      if (programId) balanceUrl.searchParams.set('program_id', programId)

      const balanceResponse = await fetch(balanceUrl, {
        headers: {
          'Authorization': `Bearer ${userData.session?.access_token || ''}`
        }
      })

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        if (balanceData.success) {
          const data = Array.isArray(balanceData.balances) ? balanceData.balances[0] : balanceData.balances
          setTierData(data)

          // Fetch all available tiers
          await fetchAllTiers(data?.loyalty_program_id)
        }
      }

    } catch (err) {
      console.error('Error fetching tier data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch all tiers for the program
  const fetchAllTiers = async (loyaltyProgramId) => {
    try {
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()

      const tiersUrl = new URL('/api/customers/loyalty/tiers', window.location.origin)
      tiersUrl.searchParams.set('barbershop_id', barbershopId)
      if (loyaltyProgramId) tiersUrl.searchParams.set('program_id', loyaltyProgramId)

      const tiersResponse = await fetch(tiersUrl, {
        headers: {
          'Authorization': `Bearer ${userData.session?.access_token || ''}`
        }
      })

      if (tiersResponse.ok) {
        const tiersData = await tiersResponse.json()
        if (tiersData.success) {
          setAllTiers(tiersData.tiers || [])
        }
      }
    } catch (err) {
      console.error('Error fetching tiers:', err)
    }
  }

  // Get tier visual info
  const getTierInfo = (tierName, tierLevel = 0) => {
    if (!tierName) return {
      color: 'bg-gray-100 text-gray-600 border-gray-200',
      bgGradient: 'from-gray-50 to-gray-100',
      icon: Medal,
      label: 'Member',
      description: 'Welcome to our loyalty program!'
    }

    const tierLower = tierName.toLowerCase()
    
    if (tierLower.includes('platinum')) return {
      color: 'bg-slate-100 text-slate-800 border-slate-300',
      bgGradient: 'from-slate-50 to-slate-100',
      icon: Crown,
      label: 'Platinum',
      description: 'Elite tier with premium benefits'
    }
    if (tierLower.includes('gold')) return {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      bgGradient: 'from-yellow-50 to-yellow-100',
      icon: Trophy,
      label: 'Gold',
      description: 'Premium tier for valued customers'
    }
    if (tierLower.includes('silver')) return {
      color: 'bg-gray-100 text-gray-800 border-gray-300',
      bgGradient: 'from-gray-50 to-gray-100',
      icon: Medal,
      label: 'Silver',
      description: 'Advanced tier with enhanced rewards'
    }
    if (tierLower.includes('bronze')) return {
      color: 'bg-amber-100 text-amber-800 border-amber-300',
      bgGradient: 'from-amber-50 to-amber-100',
      icon: Medal,
      label: 'Bronze',
      description: 'Starting tier with great benefits'
    }

    return {
      color: 'bg-olive-100 text-olive-800 border-olive-300',
      bgGradient: 'from-olive-50 to-olive-100',
      icon: Star,
      label: tierName,
      description: 'Special tier status'
    }
  }

  // Get tier benefits display
  const getTierBenefits = (tier) => {
    if (!tier || !tier.benefits) return []

    const benefits = tier.benefits
    const benefitsList = []

    if (benefits.point_multiplier && benefits.point_multiplier > 1) {
      benefitsList.push({
        icon: TrendingUp,
        text: `${benefits.point_multiplier}x Point Multiplier`,
        type: 'multiplier'
      })
    }

    if (benefits.discount_percentage) {
      benefitsList.push({
        icon: Gift,
        text: `${benefits.discount_percentage}% Discount`,
        type: 'discount'
      })
    }

    if (benefits.priority_booking) {
      benefitsList.push({
        icon: Zap,
        text: 'Priority Booking',
        type: 'priority'
      })
    }

    if (benefits.exclusive_offers) {
      benefitsList.push({
        icon: Sparkles,
        text: 'Exclusive Offers',
        type: 'exclusive'
      })
    }

    return benefitsList
  }

  useEffect(() => {
    fetchTierData()
  }, [customerId, barbershopId, programId])

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="flex space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !tierData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border">
        <div className="text-center text-gray-500">
          <Target className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Tier information unavailable</p>
          <p className="text-sm mt-1">{error || 'No tier data found'}</p>
        </div>
      </div>
    )
  }

  const currentPoints = tierData.current_points || 0
  const currentTier = tierData.current_tier
  const progressPercentage = tierData.tier_progress || 0
  const pointsToNext = tierData.points_to_next_tier || 0
  const nextTierThreshold = tierData.next_tier_threshold

  // Find current tier in all tiers
  const currentTierObj = allTiers.find(t => t.tier_name === currentTier)
  const currentTierLevel = currentTierObj?.tier_level || 0
  const nextTier = allTiers.find(t => t.tier_level === currentTierLevel + 1)

  const currentTierInfo = getTierInfo(currentTier, currentTierLevel)
  const nextTierInfo = nextTier ? getTierInfo(nextTier.tier_name, nextTier.tier_level) : null
  const CurrentTierIcon = currentTierInfo.icon
  const NextTierIcon = nextTierInfo?.icon

  if (variant === 'minimal') {
    return (
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full bg-gradient-to-r ${currentTierInfo.bgGradient}`}>
          <CurrentTierIcon className="h-4 w-4 text-gray-700" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">{currentTierInfo.label}</span>
            {progressPercentage < 100 && (
              <span className="text-xs text-gray-500">{Math.round(progressPercentage)}%</span>
            )}
          </div>
          {progressPercentage < 100 && pointsToNext > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="bg-gradient-to-r from-olive-500 to-moss-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="p-4 bg-white rounded-lg border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full bg-gradient-to-r ${currentTierInfo.bgGradient}`}>
              <CurrentTierIcon className="h-5 w-5 text-gray-700" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">{currentTierInfo.label} Tier</h4>
              <p className="text-xs text-gray-500">{currentPoints.toLocaleString()} points</p>
            </div>
          </div>
          
          {progressPercentage < 100 && nextTierInfo && (
            <div className="text-right">
              <p className="text-xs text-gray-500">Next: {nextTierInfo.label}</p>
              <p className="text-xs font-medium text-gray-700">{pointsToNext} more points</p>
            </div>
          )}
        </div>

        {progressPercentage < 100 && pointsToNext > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Progress to {nextTierInfo?.label}</span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-olive-500 to-moss-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div className={`p-6 bg-gradient-to-r ${currentTierInfo.bgGradient}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white rounded-full shadow-sm">
              <CurrentTierIcon className="h-8 w-8 text-gray-700" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{currentTierInfo.label} Tier</h3>
              <p className="text-sm text-gray-600">{currentTierInfo.description}</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">
                {currentPoints.toLocaleString()} points
              </p>
            </div>
          </div>
          
          <Badge variant="outline" className={`${currentTierInfo.color} border-2 px-3 py-1`}>
            Current Tier
          </Badge>
        </div>
      </div>

      {/* Progress Section */}
      {progressPercentage < 100 && nextTierInfo && pointsToNext > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Progress to {nextTierInfo.label}</h4>
            <div className="text-right">
              <p className="text-sm text-gray-600">{pointsToNext} points to go</p>
              <p className="text-xs text-gray-500">Need {nextTierThreshold?.toLocaleString()} total</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{Math.round(progressPercentage)}% complete</span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-gradient-to-r from-olive-500 to-moss-500 h-4 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                  style={{ width: `${progressPercentage}%` }}
                >
                  {progressPercentage > 20 && (
                    <span className="text-xs text-white font-medium">
                      {Math.round(progressPercentage)}%
                    </span>
                  )}
                </div>
              </div>
              
              {/* Next tier preview */}
              <div className="absolute right-0 top-5 flex items-center space-x-2 text-sm text-gray-500">
                <NextTierIcon className="h-4 w-4" />
                <span>{nextTierInfo.label}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Tier Benefits */}
      {showBenefits && currentTierObj && (
        <div className="p-6 border-b border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-3">Your Benefits</h4>
          <div className="grid grid-cols-2 gap-3">
            {getTierBenefits(currentTierObj).map((benefit, index) => {
              const BenefitIcon = benefit.icon
              return (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-lg">
                  <BenefitIcon className="h-4 w-4 text-olive-600" />
                  <span className="text-sm text-gray-700">{benefit.text}</span>
                </div>
              )
            })}
            {getTierBenefits(currentTierObj).length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-4">
                <Star className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm">Standard member benefits apply</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tier Roadmap */}
      {showRoadmap && allTiers.length > 0 && (
        <div className="p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Tier Roadmap</h4>
          <div className="space-y-3">
            {allTiers.map((tier, index) => {
              const tierInfo = getTierInfo(tier.tier_name, tier.tier_level)
              const TierIcon = tierInfo.icon
              const isCurrentTier = tier.tier_name === currentTier
              const isUnlocked = currentTierLevel >= tier.tier_level
              const pointsRequired = tier.qualification_criteria?.points_required || 0
              
              return (
                <div key={tier.id} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${
                    isCurrentTier 
                      ? `bg-gradient-to-r ${tierInfo.bgGradient} ring-2 ring-olive-500 ring-offset-2`
                      : isUnlocked 
                        ? `bg-gradient-to-r ${tierInfo.bgGradient}`
                        : 'bg-gray-200'
                  }`}>
                    <TierIcon className={`h-5 w-5 ${
                      isUnlocked ? 'text-gray-700' : 'text-gray-400'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h5 className={`font-medium ${
                        isCurrentTier ? 'text-olive-700' : isUnlocked ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {tierInfo.label}
                        {isCurrentTier && (
                          <span className="ml-2 text-xs bg-olive-100 text-olive-700 px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </h5>
                      <span className={`text-sm ${
                        isUnlocked ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {pointsRequired.toLocaleString()} points
                      </span>
                    </div>
                    <p className={`text-xs ${
                      isUnlocked ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      {tierInfo.description}
                    </p>
                  </div>
                  
                  {index < allTiers.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}