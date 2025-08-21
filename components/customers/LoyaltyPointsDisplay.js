'use client'

import { useState, useEffect } from 'react'
import { 
  Star, 
  Gift, 
  Trophy, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Medal,
  Crown,
  Zap,
  ArrowRight,
  Calendar,
  Sparkles,
  Target,
  RefreshCw
} from 'lucide-react'
import { Badge } from '../ui/badge'
import { AnimatedPointsEffect, PointsCounterAnimation, TierProgressAnimation, PulseEffect } from './AnimatedPointsEffect'
import PointsExpirationWarning from './PointsExpirationWarning'

/**
 * LoyaltyPointsDisplay Component
 * 
 * A comprehensive loyalty points display system that shows:
 * - Current points balance with visual indicators
 * - Points history and transactions
 * - Available rewards for redemption
 * - Points expiration warnings
 * - Animated point accumulation effects
 * - Tier status and progress
 */
export default function LoyaltyPointsDisplay({ 
  customerId, 
  barbershopId, 
  programId = null,
  showHistory = true,
  showRewards = true,
  compact = false,
  onPointsUpdate = null,
  className = ''
}) {
  const [pointsData, setPointsData] = useState(null)
  const [previousPointsData, setPreviousPointsData] = useState(null)
  const [pointsHistory, setPointsHistory] = useState([])
  const [availableRewards, setAvailableRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('balance')
  const [animatingPoints, setAnimatingPoints] = useState(null)
  const [redeemingReward, setRedeemingReward] = useState(null)
  const [animationTrigger, setAnimationTrigger] = useState(null)
  const [pointsAnimationKey, setPointsAnimationKey] = useState(0)

  // Fetch loyalty points data
  const fetchPointsData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.authenticated) {
        throw new Error('Authentication required')
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

      if (!balanceResponse.ok) {
        const errorData = await balanceResponse.json()
        throw new Error(errorData.error || 'Failed to fetch points balance')
      }

      const balanceData = await balanceResponse.json()
      
      if (balanceData.success) {
        const newPointsData = Array.isArray(balanceData.balances) ? balanceData.balances[0] : balanceData.balances
        
        // Store previous data for animations
        if (pointsData) {
          setPreviousPointsData(pointsData)
          
          // Trigger animations for points changes
          const pointsChange = (newPointsData?.current_points || 0) - (pointsData?.current_points || 0)
          if (pointsChange !== 0 && animationTrigger) {
            const transactionType = pointsChange > 0 ? 'earned' : 'redeemed'
            animationTrigger(pointsChange, transactionType)
          }
          
          // Check for tier upgrade
          if (newPointsData?.current_tier !== pointsData?.current_tier && animationTrigger) {
            setTimeout(() => {
              animationTrigger(0, 'tier_upgrade')
            }, 500)
          }
        }
        
        setPointsData(newPointsData)
        setPointsAnimationKey(prev => prev + 1)
        
        // Trigger callback if provided
        if (onPointsUpdate) {
          onPointsUpdate(balanceData.balances)
        }
      }

      // Fetch points history if requested
      if (showHistory) {
        const historyUrl = new URL('/api/customers/loyalty/points', window.location.origin)
        historyUrl.searchParams.set('customer_id', customerId)
        historyUrl.searchParams.set('action', 'history')
        historyUrl.searchParams.set('limit', '20')
        if (programId) historyUrl.searchParams.set('program_id', programId)

        const historyResponse = await fetch(historyUrl, {
          headers: {
            'Authorization': `Bearer ${userData.session?.access_token || ''}`
          }
        })

        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          if (historyData.success) {
            setPointsHistory(historyData.transactions || [])
          }
        }
      }

      // Fetch available rewards if requested
      if (showRewards && pointsData) {
        await fetchAvailableRewards(pointsData.current_tier)
      }

    } catch (err) {
      console.error('Error fetching loyalty points data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Fetch available rewards
  const fetchAvailableRewards = async (customerTier = null) => {
    try {
      const rewardsUrl = new URL('/api/customers/loyalty/rewards', window.location.origin)
      rewardsUrl.searchParams.set('barbershop_id', barbershopId)
      if (programId) rewardsUrl.searchParams.set('program_id', programId)
      if (customerTier) rewardsUrl.searchParams.set('customer_tier', customerTier)

      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()

      const rewardsResponse = await fetch(rewardsUrl, {
        headers: {
          'Authorization': `Bearer ${userData.session?.access_token || ''}`
        }
      })

      if (rewardsResponse.ok) {
        const rewardsData = await rewardsResponse.json()
        if (rewardsData.success) {
          setAvailableRewards(rewardsData.rewards || [])
        }
      }
    } catch (err) {
      console.error('Error fetching available rewards:', err)
    }
  }

  // Handle reward redemption
  const handleRedeemReward = async (reward) => {
    if (!pointsData || pointsData.current_points < reward.points_required) {
      return
    }

    setRedeemingReward(reward.reward_name)

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
          loyalty_program_id: pointsData.loyalty_program_id,
          reward_type: reward.reward_type,
          reward_name: reward.reward_name,
          points_redeemed: reward.points_required,
          monetary_value: reward.monetary_value || 0
        })
      })

      if (redeemResponse.ok) {
        const redeemData = await redeemResponse.json()
        if (redeemData.success) {
          // Animate points deduction
          animatePointsChange(-reward.points_required)
          
          // Refresh data
          await fetchPointsData()
          
          // Show success message
          alert(`Successfully redeemed ${reward.reward_name}! Redemption code: ${redeemData.redemption_code}`)
        }
      } else {
        const errorData = await redeemResponse.json()
        alert(`Redemption failed: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error redeeming reward:', err)
      alert('Failed to redeem reward. Please try again.')
    } finally {
      setRedeemingReward(null)
    }
  }

  // Animate points change
  const animatePointsChange = (pointsChange) => {
    setAnimatingPoints(pointsChange)
    setTimeout(() => setAnimatingPoints(null), 2000)
  }

  // Get tier color and icon
  const getTierInfo = (tierName) => {
    if (!tierName) return { color: 'bg-gray-100 text-gray-800', icon: Medal, label: 'Member' }
    
    const tierLower = tierName.toLowerCase()
    if (tierLower.includes('platinum')) return { color: 'bg-slate-100 text-slate-800 border-slate-300', icon: Crown, label: 'Platinum' }
    if (tierLower.includes('gold')) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Trophy, label: 'Gold' }
    if (tierLower.includes('silver')) return { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: Medal, label: 'Silver' }
    if (tierLower.includes('bronze')) return { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Medal, label: 'Bronze' }
    
    return { color: 'bg-olive-100 text-olive-800 border-olive-300', icon: Medal, label: tierName }
  }

  // Get transaction icon
  const getTransactionIcon = (transactionType) => {
    switch (transactionType) {
      case 'earned': return { icon: TrendingUp, color: 'text-green-600' }
      case 'bonus': return { icon: Sparkles, color: 'text-blue-600' }
      case 'redeemed': return { icon: Gift, color: 'text-red-600' }
      case 'expired': return { icon: Clock, color: 'text-gray-500' }
      case 'adjusted': return { icon: RefreshCw, color: 'text-orange-600' }
      default: return { icon: Star, color: 'text-gray-600' }
    }
  }

  // Check for expiring points
  const getExpiringPoints = () => {
    if (!pointsHistory) return []
    
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    return pointsHistory.filter(transaction => {
      if (transaction.expires_at && transaction.points_amount > 0) {
        const expiryDate = new Date(transaction.expires_at)
        return expiryDate <= thirtyDaysFromNow && expiryDate > now
      }
      return false
    })
  }

  useEffect(() => {
    fetchPointsData()
  }, [customerId, barbershopId, programId])

  if (loading) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="text-center text-red-600">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Unable to load loyalty points</p>
          <p className="text-sm mt-1">{error}</p>
          <button 
            onClick={fetchPointsData}
            className="mt-3 px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!pointsData) {
    return (
      <div className={`p-6 bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="text-center text-gray-500">
          <Star className="h-8 w-8 mx-auto mb-2" />
          <p className="font-medium">Not enrolled in loyalty program</p>
          <p className="text-sm mt-1">Ask staff about joining our rewards program!</p>
        </div>
      </div>
    )
  }

  const tierInfo = getTierInfo(pointsData.current_tier)
  const TierIcon = tierInfo.icon
  const expiringPoints = getExpiringPoints()
  const progressPercentage = pointsData.tier_progress || 0

  if (compact) {
    return (
      <div className={`p-4 bg-gradient-to-r from-olive-50 to-moss-50 rounded-lg border ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-gold-600" />
              <span className="font-bold text-lg text-gray-900">
                {pointsData.current_points?.toLocaleString() || 0}
              </span>
              {animatingPoints && (
                <span className={`text-sm font-medium animate-bounce ${animatingPoints > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {animatingPoints > 0 ? '+' : ''}{animatingPoints}
                </span>
              )}
            </div>
            <Badge variant="outline" className={`${tierInfo.color} border`}>
              <TierIcon className="h-3 w-3 mr-1" />
              {tierInfo.label}
            </Badge>
          </div>
          
          {progressPercentage < 100 && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-olive-500 to-moss-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs">{Math.round(progressPercentage)}%</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Loyalty Points</h3>
          <button 
            onClick={fetchPointsData}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Points Balance Section */}
      <div className="p-6 bg-gradient-to-r from-olive-50 to-moss-50">
        <AnimatedPointsEffect onPointsChange={setAnimationTrigger} showSparkles={true}>
          <div className="text-center mb-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <PulseEffect active={pointsAnimationKey > 1} color="gold" intensity="medium">
                <Star className="h-8 w-8 text-gold-600" />
              </PulseEffect>
              <span className="text-4xl font-bold text-gray-900">
                <PointsCounterAnimation 
                  currentPoints={pointsData.current_points || 0}
                  previousPoints={previousPointsData?.current_points}
                  duration={1200}
                />
              </span>
            </div>
            <p className="text-gray-600">Available Points</p>
          </div>
        </AnimatedPointsEffect>

        {/* Tier Status */}
        <div className="flex items-center justify-center space-x-4 mb-6">
          <Badge variant="outline" className={`${tierInfo.color} border px-3 py-1`}>
            <TierIcon className="h-4 w-4 mr-2" />
            {tierInfo.label} Member
          </Badge>
        </div>

        {/* Tier Progress */}
        {progressPercentage < 100 && pointsData.points_to_next_tier > 0 && (
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progress to Next Tier</span>
              <span className="text-sm text-gray-600">{Math.round(progressPercentage)}%</span>
            </div>
            <TierProgressAnimation 
              currentProgress={progressPercentage}
              previousProgress={previousPointsData?.tier_progress}
              duration={1500}
              className="mb-2"
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{pointsData.points_to_next_tier} points to go</span>
              <Target className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Expiring Points Warning */}
        <PointsExpirationWarning 
          customerId={customerId}
          barbershopId={barbershopId}
          programId={pointsData?.loyalty_program_id}
          threshold={30}
          className="mb-4"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {showHistory && (
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 text-sm font-medium border-b-2 ${
                activeTab === 'history'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>History</span>
              </div>
            </button>
          )}
          {showRewards && (
            <button
              onClick={() => setActiveTab('rewards')}
              className={`py-4 text-sm font-medium border-b-2 ${
                activeTab === 'rewards'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Gift className="h-4 w-4" />
                <span>Rewards</span>
              </div>
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Recent Activity</h4>
            {pointsHistory.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>No points activity yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pointsHistory.map((transaction) => {
                  const transactionInfo = getTransactionIcon(transaction.transaction_type)
                  const TransactionIcon = transactionInfo.icon
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full bg-white ${transactionInfo.color}`}>
                          <TransactionIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description || `Points ${transaction.transaction_type}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString()}
                            {transaction.expires_at && (
                              <span className="ml-2">
                                • Expires {new Date(transaction.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`font-medium ${
                          transaction.points_amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.points_amount > 0 ? '+' : ''}{transaction.points_amount}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Available Rewards</h4>
            {availableRewards.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Gift className="h-8 w-8 mx-auto mb-2" />
                <p>No rewards available</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableRewards.map((reward, index) => {
                  const canAfford = pointsData.current_points >= reward.points_required
                  const isRedeeming = redeemingReward === reward.reward_name
                  
                  return (
                    <div 
                      key={index}
                      className={`p-4 border rounded-lg transition-all ${
                        canAfford ? 'border-olive-200 bg-olive-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{reward.reward_name}</h5>
                          {reward.description && (
                            <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
                          )}
                          <div className="flex items-center space-x-2 mt-2">
                            <Star className="h-4 w-4 text-gold-600" />
                            <span className="text-sm font-medium">{reward.points_required} points</span>
                            {reward.monetary_value > 0 && (
                              <span className="text-sm text-gray-500">
                                (${reward.monetary_value} value)
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRedeemReward(reward)}
                          disabled={!canAfford || isRedeeming}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            canAfford && !isRedeeming
                              ? 'bg-olive-600 text-white hover:bg-olive-700'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          {isRedeeming ? (
                            <div className="flex items-center space-x-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span>Redeeming...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <span>Redeem</span>
                              <ArrowRight className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}