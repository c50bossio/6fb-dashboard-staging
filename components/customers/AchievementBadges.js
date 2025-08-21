'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { getBadgeRarityStyle, getBadgeCategoryInfo, BADGE_CATEGORIES } from '../../utils/badgeSystem'
import BadgeUnlockAnimation from './BadgeUnlockAnimation'
import { Trophy, Star, Award, Gift, Calendar, Loader2, RefreshCw } from 'lucide-react'

const categoryIcons = {
  loyalty: Trophy,
  milestone: Star,
  spending: Award,
  special: Gift,
  seasonal: Calendar
}

export default function AchievementBadges({ 
  customerId, 
  barbershopId,
  onBadgeUnlock = null,
  showProgress = true,
  autoRefresh = false,
  compact = false 
}) {
  const [badges, setBadges] = useState([])
  const [progress, setProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [newlyUnlockedBadges, setNewlyUnlockedBadges] = useState([])
  const [statistics, setStatistics] = useState({})

  // Fetch customer badges and progress
  const fetchBadgesData = async () => {
    if (!customerId) return

    try {
      setError(null)
      
      // Fetch earned badges
      const badgesParams = new URLSearchParams({
        customer_id: customerId,
        include_progress: showProgress.toString()
      })
      if (barbershopId) badgesParams.append('barbershop_id', barbershopId)

      const badgesResponse = await fetch(`/api/customers/badges?${badgesParams}`)
      const badgesData = await badgesResponse.json()

      if (!badgesData.success) {
        throw new Error(badgesData.error || 'Failed to fetch badges')
      }

      setBadges(badgesData.earned_badges || [])
      setStatistics({
        total_badges: badgesData.total_badges || 0,
        total_points: badgesData.total_points || 0,
        completion_percentage: badgesData.completion_percentage || 0
      })

      // Fetch detailed progress if needed
      if (showProgress) {
        const progressParams = new URLSearchParams({
          customer_id: customerId,
          include_completed: 'false'
        })

        const progressResponse = await fetch(`/api/customers/badges/progress?${progressParams}`)
        const progressData = await progressResponse.json()

        if (progressData.success) {
          setProgress(progressData.badge_progress || [])
          setStatistics(prev => ({
            ...prev,
            ...progressData.statistics
          }))
        }
      }

    } catch (err) {
      console.error('Error fetching badges:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Check for new badge unlocks
  const checkForNewBadges = async () => {
    if (!customerId) return

    try {
      const response = await fetch('/api/customers/badges/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          customer_id: customerId,
          trigger_event: 'manual_check'
        })
      })

      const data = await response.json()
      
      if (data.success && data.newly_earned_badges?.length > 0) {
        setNewlyUnlockedBadges(data.newly_earned_badges)
        
        // Refresh badges data
        await fetchBadgesData()
        
        // Notify parent component
        if (onBadgeUnlock) {
          onBadgeUnlock(data.newly_earned_badges)
        }
      }
    } catch (err) {
      console.error('Error checking for new badges:', err)
    }
  }

  // Refresh badges data
  const refreshBadges = async () => {
    setRefreshing(true)
    await fetchBadgesData()
  }

  useEffect(() => {
    fetchBadgesData()
    
    // Auto-refresh if enabled
    if (autoRefresh) {
      const interval = setInterval(checkForNewBadges, 30000) // Check every 30 seconds
      return () => clearInterval(interval)
    }
  }, [customerId, barbershopId, showProgress, autoRefresh])

  // Filter badges by category
  const filterBadgesByCategory = (badges, category) => {
    if (category === 'all') return badges
    return badges.filter(badge => badge.category === category)
  }

  // Render individual badge
  const renderBadge = (badge, isProgress = false) => {
    const rarityStyle = getBadgeRarityStyle(badge.rarity)
    const isEarned = !isProgress

    return (
      <div
        key={badge.id || badge.badge_key}
        className={`
          relative p-3 rounded-xl border-2 transition-all duration-300 hover:scale-105
          ${isEarned 
            ? `border-${rarityStyle.color} bg-gradient-to-br from-${rarityStyle.color}/10 to-${rarityStyle.color}/5 shadow-lg` 
            : 'border-gray-200 bg-gray-50 opacity-70'
          }
        `}
        style={{
          borderColor: isEarned ? rarityStyle.color : undefined,
          boxShadow: isEarned ? `0 4px 20px ${rarityStyle.glowColor}40` : undefined
        }}
      >
        {/* Badge Icon */}
        <div className="text-center mb-2">
          <span 
            className={`text-3xl ${isEarned ? 'animate-pulse' : 'grayscale'}`}
            style={{ filter: isEarned ? 'none' : 'grayscale(100%)' }}
          >
            {badge.icon}
          </span>
        </div>

        {/* Badge Name */}
        <h4 className={`font-semibold text-sm text-center mb-1 ${isEarned ? 'text-gray-900' : 'text-gray-500'}`}>
          {badge.name}
        </h4>

        {/* Badge Description */}
        <p className={`text-xs text-center mb-2 ${isEarned ? 'text-gray-600' : 'text-gray-400'}`}>
          {badge.description}
        </p>

        {/* Progress Bar for unearned badges */}
        {isProgress && badge.progress && (
          <div className="mt-2">
            <Progress 
              value={badge.progress.percentage} 
              className="h-2 mb-1"
            />
            <p className="text-xs text-center text-gray-500">
              {badge.progress.current}/{badge.progress.target} ({Math.round(badge.progress.percentage)}%)
            </p>
          </div>
        )}

        {/* Badge Rarity & Points */}
        <div className="flex justify-between items-center mt-2">
          <Badge 
            variant="outline" 
            className="text-xs"
            style={{ 
              borderColor: rarityStyle.color, 
              color: rarityStyle.color 
            }}
          >
            {rarityStyle.label}
          </Badge>
          <span className="text-xs font-medium text-gray-600">
            {badge.points} pts
          </span>
        </div>

        {/* Earned Date */}
        {isEarned && badge.earned_at && (
          <p className="text-xs text-gray-400 text-center mt-1">
            Earned {new Date(badge.earned_at).toLocaleDateString()}
          </p>
        )}

        {/* Sparkles for legendary badges */}
        {isEarned && badge.rarity === 'legendary' && (
          <div className="absolute -top-1 -right-1 text-yellow-400 animate-bounce">
            ✨
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card className={compact ? 'p-4' : undefined}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Loading badges...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={compact ? 'p-4' : undefined}>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading badges: {error}</p>
          <Button onClick={fetchBadgesData} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    // Compact view for dashboard
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Achievement Badges</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshBadges}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {statistics.total_badges > 0 && (
            <div className="text-sm text-gray-600">
              {statistics.total_badges} badges earned • {statistics.total_points} points
            </div>
          )}
        </CardHeader>
        <CardContent>
          {badges.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {badges.slice(0, 6).map(badge => renderBadge(badge))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No badges earned yet. Start your journey!
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Newly Unlocked Badge Animation */}
      {newlyUnlockedBadges.length > 0 && (
        <BadgeUnlockAnimation
          badges={newlyUnlockedBadges}
          onAnimationComplete={() => setNewlyUnlockedBadges([])}
        />
      )}

      {/* Statistics Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{statistics.earned_badges || 0}</div>
              <div className="text-sm text-gray-600">Badges Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{statistics.total_points || 0}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{statistics.in_progress_badges || 0}</div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {Math.round(statistics.completion_percentage || 0)}%
              </div>
              <div className="text-sm text-gray-600">Completion</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Badge Collection</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={checkForNewBadges}
                disabled={refreshing}
              >
                Check for New Badges
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBadges}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">All</TabsTrigger>
              {Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
                const IconComponent = categoryIcons[category.value]
                return (
                  <TabsTrigger key={key} value={category.value}>
                    <IconComponent className="w-4 h-4 mr-1" />
                    {category.label}
                  </TabsTrigger>
                )
              })}
            </TabsList>

            {/* Earned Badges */}
            <TabsContent value={selectedCategory} className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Earned Badges</h3>
                  {filterBadgesByCategory(badges, selectedCategory).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filterBadgesByCategory(badges, selectedCategory).map(badge => 
                        renderBadge(badge)
                      )}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No {selectedCategory === 'all' ? '' : selectedCategory} badges earned yet.
                    </p>
                  )}
                </div>

                {/* Progress Badges */}
                {showProgress && progress.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">In Progress</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filterBadgesByCategory(progress, selectedCategory)
                        .filter(badge => badge.progress?.percentage > 0)
                        .slice(0, 8)
                        .map(badge => renderBadge(badge, true))
                      }
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}