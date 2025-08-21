'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '../ui/Button'
import { 
  getBadgeRarityStyle, 
  getBadgeCategoryInfo, 
  BADGE_CATEGORIES,
  formatProgressText 
} from '../../utils/badgeSystem'

const categoryIcons = {
  loyalty: Trophy,
  milestone: Star,
  spending: Award,
  special: Gift,
  seasonal: Calendar
}

export default function BadgeProgress({ 
  customerId, 
  barbershopId,
  showOnlyNextTargets = false,
  showCompletedBadges = false,
  groupByCategory = true,
  showQuickActions = true,
  onProgressUpdate = null,
  maxDisplayedBadges = null
}) {
  const [progressData, setProgressData] = useState([])
  const [statistics, setStatistics] = useState({})
  const [customerStats, setCustomerStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('progress_desc')

  // Fetch badge progress data
  const fetchProgressData = async () => {
    if (!customerId) return

    try {
      setError(null)
      
      const params = new URLSearchParams({
        customer_id: customerId,
        include_completed: showCompletedBadges.toString()
      })
      if (barbershopId) params.append('barbershop_id', barbershopId)

      const response = await fetch(`/api/customers/badges/progress?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch progress data')
      }

      setProgressData(data.badge_progress || [])
      setStatistics(data.statistics || {})
      setCustomerStats(data.customer_stats || {})

      if (onProgressUpdate) {
        onProgressUpdate(data)
      }

    } catch (err) {
      console.error('Error fetching progress data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgressData()
  }, [customerId, barbershopId, showCompletedBadges])

  // Filter and sort progress data
  const getFilteredAndSortedData = () => {
    let filtered = [...progressData]

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(badge => badge.category === selectedCategory)
    }

    // Filter for next targets only
    if (showOnlyNextTargets) {
      // Group by category and show only the closest badge in each category
      const byCategory = {}
      filtered.forEach(badge => {
        if (!byCategory[badge.category] || 
            badge.progress.percentage > byCategory[badge.category].progress.percentage) {
          byCategory[badge.category] = badge
        }
      })
      filtered = Object.values(byCategory)
    }

    // Apply sorting
    switch (sortBy) {
      case 'progress_desc':
        filtered.sort((a, b) => b.progress.percentage - a.progress.percentage)
        break
      case 'progress_asc':
        filtered.sort((a, b) => a.progress.percentage - b.progress.percentage)
        break
      case 'points_desc':
        filtered.sort((a, b) => b.points - a.points)
        break
      case 'alphabetical':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'category':
        filtered.sort((a, b) => a.category.localeCompare(b.category))
        break
    }

    // Limit displayed badges if specified
    if (maxDisplayedBadges && maxDisplayedBadges > 0) {
      filtered = filtered.slice(0, maxDisplayedBadges)
    }

    return filtered
  }

  // Render progress bar with enhanced visuals
  const renderProgressBar = (badge) => {
    const { progress } = badge
    const rarityStyle = getBadgeRarityStyle(badge.rarity)
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">
            {formatProgressText(progress)}
          </span>
          <span className="font-medium" style={{ color: rarityStyle.color }}>
            {Math.round(progress.percentage)}%
          </span>
        </div>
        
        <div className="relative">
          <Progress 
            value={progress.percentage} 
            className="h-3"
          />
          
          {/* Glow effect for high progress */}
          {progress.percentage >= 80 && (
            <div 
              className="absolute inset-0 rounded-full opacity-50 animate-pulse"
              style={{ 
                background: `linear-gradient(90deg, transparent, ${rarityStyle.color}40, transparent)`,
                filter: 'blur(2px)'
              }}
            />
          )}
        </div>
        
        {progress.remaining > 0 && (
          <p className="text-xs text-gray-500">
            {progress.remaining} more needed
          </p>
        )}
      </div>
    )
  }

  // Render individual badge progress card
  const renderBadgeCard = (badge) => {
    const rarityStyle = getBadgeRarityStyle(badge.rarity)
    const categoryInfo = getBadgeCategoryInfo(badge.category)
    const CategoryIcon = categoryIcons[badge.category]
    
    return (
      <Card 
        key={badge.id}
        className={`transition-all duration-300 hover:shadow-lg ${
          badge.progress.percentage >= 100 ? 'ring-2 ring-green-500' : ''
        }`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Badge Icon */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl"
              style={{ 
                backgroundColor: `${rarityStyle.color}15`,
                color: rarityStyle.color 
              }}
            >
              {badge.icon}
            </div>
            
            {/* Badge Info */}
            <div className="flex-grow min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900 truncate">
                    {badge.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
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
                    <span className="text-xs text-gray-500">
                      {badge.points} pts
                    </span>
                  </div>
                </div>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <CategoryIcon className="w-4 h-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{categoryInfo.label}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {badge.description}
              </p>
              
              {renderProgressBar(badge)}
              
              {/* Achievement Status */}
              {badge.progress.percentage >= 100 && (
                <div className="flex items-center gap-1 mt-2 text-green-600 text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Ready to unlock!
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Render category summary
  const renderCategorySummary = () => {
    const categoryData = Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
      const categoryBadges = progressData.filter(badge => badge.category === category.value)
      const completed = categoryBadges.filter(badge => badge.earned).length
      const inProgress = categoryBadges.filter(badge => 
        !badge.earned && badge.progress.percentage > 0
      ).length
      const total = categoryBadges.length
      
      return {
        ...category,
        completed,
        inProgress,
        total,
        completionRate: total > 0 ? (completed / total * 100) : 0
      }
    })

    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {categoryData.map(category => {
          const Icon = categoryIcons[category.value]
          return (
            <Card 
              key={category.value}
              className={`cursor-pointer transition-all ${
                selectedCategory === category.value ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedCategory(category.value)}
            >
              <CardContent className="p-4 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                <h4 className="font-medium text-sm mb-1">{category.label}</h4>
                <div className="text-xs text-gray-500">
                  {category.completed}/{category.total}
                </div>
                <Progress 
                  value={category.completionRate} 
                  className="h-1 mt-2"
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  // Quick actions for boosting progress
  const renderQuickActions = () => {
    const actions = [
      {
        icon: Calendar,
        title: 'Book Next Appointment',
        description: 'Progress toward visit milestones',
        action: () => console.log('Navigate to booking')
      },
      {
        icon: Star,
        title: 'Leave a Review',
        description: 'Unlock the Review Star badge',
        action: () => console.log('Navigate to reviews')
      },
      {
        icon: Gift,
        title: 'Refer a Friend',
        description: 'Earn referral badges',
        action: () => console.log('Open referral system')
      }
    ]

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Quick Actions to Earn Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {actions.map((action, index) => (
              <div 
                key={index}
                className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={action.action}
              >
                <action.icon className="w-5 h-5 text-blue-600 mb-2" />
                <h4 className="font-medium text-sm mb-1">{action.title}</h4>
                <p className="text-xs text-gray-600">{action.description}</p>
                <ArrowRight className="w-3 h-3 text-gray-400 mt-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchProgressData} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const filteredData = getFilteredAndSortedData()

  return (
    <div className="space-y-6">
      {/* Overall Progress Statistics */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {statistics.earned_badges || 0}
              </div>
              <div className="text-sm text-gray-600">Badges Earned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round(statistics.completion_percentage || 0)}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {statistics.in_progress_badges || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {statistics.total_points || 0}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Summary */}
      {groupByCategory && renderCategorySummary()}

      {/* Quick Actions */}
      {showQuickActions && renderQuickActions()}

      {/* Progress Display */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {showOnlyNextTargets ? 'Next Targets' : 'Badge Progress'}
            </CardTitle>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="progress_desc">Progress (High to Low)</option>
                <option value="progress_asc">Progress (Low to High)</option>
                <option value="points_desc">Points (High to Low)</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="category">By Category</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredData.length > 0 ? (
            <div className="space-y-4">
              {filteredData.map(renderBadgeCard)}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {showOnlyNextTargets ? 'All Targets Complete!' : 'No Progress to Show'}
              </h3>
              <p className="text-gray-600">
                {showOnlyNextTargets 
                  ? 'You\'ve made progress on all available badges!'
                  : 'Start your journey to unlock achievement badges!'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}