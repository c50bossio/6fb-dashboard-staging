'use client'

import React, { useState, useEffect } from 'react'
import React, { 
  Star, 
  Trophy, 
  Medal, 
  Crown, 
  Target,
  Sparkles,
  Zap,
  Gift
} from 'lucide-react'
import React, { Badge } from '../ui/badge'

/**
 * LoyaltyPointsBadge Component
 * 
 * A compact display of customer loyalty points and tier status for customer cards
 * Shows points balance, tier badge, and progress indicator
 */
export default function LoyaltyPointsBadge({ 
  customerId, 
  barbershopId, 
  programId = null,
  showProgress = true,
  size = 'default' // 'sm', 'default', 'lg'
}) {
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch loyalty data
  const fetchLoyaltyData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.authenticated) {
        return
      }

      // Fetch points balance
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
          setLoyaltyData(data)
        }
      }

    } catch (err) {
      console.error('Error fetching loyalty data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get tier info with colors and icons
  const getTierInfo = (tierName) => {
    if (!tierName) return { 
      color: 'bg-gray-100 text-gray-600 border-gray-200', 
      icon: Medal, 
      label: 'Member',
      gradient: 'from-gray-100 to-gray-200'
    }
    
    const tierLower = tierName.toLowerCase()
    if (tierLower.includes('platinum')) return { 
      color: 'bg-slate-100 text-slate-800 border-slate-300', 
      icon: Crown, 
      label: 'Platinum',
      gradient: 'from-slate-100 to-slate-200'
    }
    if (tierLower.includes('gold')) return { 
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300', 
      icon: Trophy, 
      label: 'Gold',
      gradient: 'from-yellow-100 to-yellow-200'
    }
    if (tierLower.includes('silver')) return { 
      color: 'bg-gray-100 text-gray-800 border-gray-300', 
      icon: Medal, 
      label: 'Silver',
      gradient: 'from-gray-100 to-gray-200'
    }
    if (tierLower.includes('bronze')) return { 
      color: 'bg-amber-100 text-amber-800 border-amber-300', 
      icon: Medal, 
      label: 'Bronze',
      gradient: 'from-amber-100 to-amber-200'
    }
    
    return { 
      color: 'bg-olive-100 text-olive-800 border-olive-300', 
      icon: Medal, 
      label: tierName,
      gradient: 'from-olive-100 to-olive-200'
    }
  }

  // Get point level indicator
  const getPointsLevel = (points) => {
    if (points >= 5000) return { level: 'elite', color: 'text-purple-600', icon: Crown }
    if (points >= 2000) return { level: 'high', color: 'text-yellow-600', icon: Trophy }
    if (points >= 500) return { level: 'medium', color: 'text-green-600', icon: Sparkles }
    if (points >= 100) return { level: 'low', color: 'text-blue-600', icon: Star }
    return { level: 'minimal', color: 'text-gray-500', icon: Target }
  }

  useEffect(() => {
    fetchLoyaltyData()
  }, [customerId, barbershopId, programId])

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className={`${size === 'sm' ? 'h-4 w-8' : 'h-5 w-12'} bg-gray-200 animate-pulse rounded`}></div>
        <div className={`${size === 'sm' ? 'h-4 w-12' : 'h-5 w-16'} bg-gray-200 animate-pulse rounded`}></div>
      </div>
    )
  }

  if (error || !loyaltyData) {
    return (
      <div className="flex items-center space-x-1 text-gray-400">
        <Star className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'}`} />
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          No points
        </span>
      </div>
    )
  }

  const points = loyaltyData.current_points || 0
  const tierInfo = getTierInfo(loyaltyData.current_tier)
  const pointsLevel = getPointsLevel(points)
  const TierIcon = tierInfo.icon
  const PointsIcon = pointsLevel.icon
  const progressPercentage = loyaltyData.tier_progress || 0

  if (size === 'sm') {
    return (
      <div className="flex items-center space-x-2">
        {/* Points Badge */}
        <div className="flex items-center space-x-1">
          <PointsIcon className={`h-3 w-3 ${pointsLevel.color}`} />
          <span className="text-xs font-medium text-gray-700">
            {points.toLocaleString()}
          </span>
        </div>
        
        {/* Tier Badge */}
        <Badge variant="outline" className={`${tierInfo.color} border text-xs px-1.5 py-0.5`}>
          <TierIcon className="h-2.5 w-2.5 mr-1" />
          {tierInfo.label}
        </Badge>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Points Section */}
      <div className="flex items-center space-x-2">
        <div className={`p-1.5 rounded-full bg-gradient-to-r ${tierInfo.gradient}`}>
          <PointsIcon className={`${size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} ${pointsLevel.color}`} />
        </div>
        <div className="flex flex-col">
          <span className={`${size === 'lg' ? 'text-base' : 'text-sm'} font-bold text-gray-900`}>
            {points.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500">points</span>
        </div>
      </div>

      {/* Tier Badge */}
      <Badge variant="outline" className={`${tierInfo.color} border ${size === 'lg' ? 'px-3 py-1' : 'px-2.5 py-0.5'}`}>
        <TierIcon className={`${size === 'lg' ? 'h-4 w-4' : 'h-3 w-3'} mr-1`} />
        {tierInfo.label}
      </Badge>

      {/* Progress Bar (if not at max tier and showProgress is true) */}
      {showProgress && progressPercentage < 100 && loyaltyData.points_to_next_tier > 0 && (
        <div className="flex items-center space-x-2">
          <div className={`${size === 'lg' ? 'w-20' : 'w-16'} bg-gray-200 rounded-full h-2`}>
            <div 
              className="bg-gradient-to-r from-olive-500 to-moss-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="text-xs text-gray-500">{Math.round(progressPercentage)}%</span>
        </div>
      )}
    </div>
  )
}

/**
 * Quick Redeem Button Component
 * Shows available rewards that customer can redeem immediately
 */
export function QuickRedeemButton({ customerId, barbershopId, programId = null }) {
  const [quickRewards, setQuickRewards] = useState([])
  const [showRewards, setShowRewards] = useState(false)
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(null)

  const fetchQuickRewards = async () => {
    if (loading) return
    
    setLoading(true)
    try {
      // Get user session and customer points
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.authenticated) return

      // Get customer points first
      const balanceUrl = new URL('/api/customers/loyalty/points', window.location.origin)
      balanceUrl.searchParams.set('customer_id', customerId)
      balanceUrl.searchParams.set('action', 'balance')
      if (programId) balanceUrl.searchParams.set('program_id', programId)

      const balanceResponse = await fetch(balanceUrl, {
        headers: { 'Authorization': `Bearer ${userData.session?.access_token || ''}` }
      })

      if (!balanceResponse.ok) return

      const balanceData = await balanceResponse.json()
      if (!balanceData.success) return

      const loyaltyData = Array.isArray(balanceData.balances) ? balanceData.balances[0] : balanceData.balances
      const currentPoints = loyaltyData?.current_points || 0

      // Get available rewards
      const rewardsUrl = new URL('/api/customers/loyalty/rewards', window.location.origin)
      rewardsUrl.searchParams.set('barbershop_id', barbershopId)
      if (programId) rewardsUrl.searchParams.set('program_id', programId)

      const rewardsResponse = await fetch(rewardsUrl, {
        headers: { 'Authorization': `Bearer ${userData.session?.access_token || ''}` }
      })

      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json()
        if (rewardsData.success) {
          // Filter rewards customer can afford, limit to 3 cheapest
          const affordableRewards = (rewardsData.rewards || [])
            .filter(reward => currentPoints >= reward.points_required)
            .sort((a, b) => a.points_required - b.points_required)
            .slice(0, 3)
          
          setQuickRewards(affordableRewards)
        }
      }
    } catch (err) {
      console.error('Error fetching quick rewards:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickRedeem = async (reward) => {
    setRedeeming(reward.reward_name)
    
    try {
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()

      const redeemResponse = await fetch('/api/customers/loyalty/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userData.session?.access_token || ''}`
        },
        body: JSON.stringify({
          customer_id: customerId,
          loyalty_program_id: programId,
          reward_type: reward.reward_type,
          reward_name: reward.reward_name,
          points_redeemed: reward.points_required,
          monetary_value: reward.monetary_value || 0
        })
      })

      if (redeemResponse.ok) {
        const redeemData = await redeemResponse.json()
        if (redeemData.success) {
          alert(`Successfully redeemed ${reward.reward_name}! Code: ${redeemData.redemption_code}`)
          setShowRewards(false)
          // Refresh parent component data if needed
          window.location.reload()
        }
      } else {
        const errorData = await redeemResponse.json()
        alert(`Redemption failed: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error redeeming reward:', err)
      alert('Failed to redeem reward. Please try again.')
    } finally {
      setRedeeming(null)
    }
  }

  if (quickRewards.length === 0) {
    return (
      <button
        onClick={fetchQuickRewards}
        disabled={loading}
        className="inline-flex items-center px-2 py-1 text-xs text-gray-500 hover:text-gray-700 rounded"
      >
        <Gift className="h-3 w-3 mr-1" />
        {loading ? 'Loading...' : 'Rewards'}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          if (quickRewards.length === 0) {
            fetchQuickRewards()
          }
          setShowRewards(!showRewards)
        }}
        className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 hover:bg-green-200 rounded"
      >
        <Gift className="h-3 w-3 mr-1" />
        Redeem ({quickRewards.length})
      </button>

      {showRewards && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <div className="p-3">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Redeem</h4>
            <div className="space-y-2">
              {quickRewards.map((reward, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{reward.reward_name}</p>
                    <p className="text-xs text-gray-600">{reward.points_required} points</p>
                  </div>
                  <button
                    onClick={() => handleQuickRedeem(reward)}
                    disabled={redeeming === reward.reward_name}
                    className="px-2 py-1 text-xs bg-green-600 text-white hover:bg-green-700 rounded disabled:opacity-50"
                  >
                    {redeeming === reward.reward_name ? 'Redeeming...' : 'Redeem'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}