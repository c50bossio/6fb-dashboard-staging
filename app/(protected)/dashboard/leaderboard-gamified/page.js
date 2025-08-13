'use client'

import { 
  TrophyIcon,
  FireIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  UserGroupIcon,
  ClockIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ChartBarIcon,
  AcademicCapIcon,
  HandThumbUpIcon,
  SparklesIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { 
  TrophyIcon as TrophySolidIcon,
  FireIcon as FireSolidIcon,
  StarIcon as StarSolidIcon
} from '@heroicons/react/24/solid'
import { useState, useEffect, useCallback } from 'react'

import ProtectedRoute from '../../../../components/ProtectedRoute'
import { Card } from '../../../../components/ui'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

// Achievement Badge Component
function AchievementBadge({ achievement, earned = false, size = 'medium' }) {
  const sizeClasses = {
    small: 'w-8 h-8 text-xs',
    medium: 'w-12 h-12 text-sm', 
    large: 'w-16 h-16 text-base'
  }

  const bgClasses = earned 
    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg'
    : 'bg-gray-200 text-gray-500'

  return (
    <div 
      className={`${sizeClasses[size]} ${bgClasses} rounded-full flex items-center justify-center font-bold transition-all duration-300 hover:scale-110 cursor-pointer group relative`}
      title={achievement.description}
    >
      <span className="text-2xl">{achievement.icon}</span>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
        <div className="font-medium">{achievement.name}</div>
        <div className="text-gray-300">{achievement.description}</div>
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  )
}

// Leaderboard Rank Component
function LeaderboardRank({ rank, barber, category, showDetails = false }) {
  const getRankIcon = (position) => {
    switch (position) {
      case 1: return <TrophyIcon className="h-6 w-6 text-amber-800" />
      case 2: return <TrophySolidIcon className="h-6 w-6 text-gray-400" />
      case 3: return <TrophySolidIcon className="h-6 w-6 text-amber-700" />
      default: return <span className="text-lg font-bold text-gray-500">#{position}</span>
    }
  }

  const getRankBg = (position) => {
    switch (position) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300'  
      case 3: return 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
      default: return 'bg-white border-gray-200'
    }
  }

  return (
    <Card className={`${getRankBg(rank)} transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Rank Position */}
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-current">
            {getRankIcon(rank)}
          </div>
          
          {/* Barber Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{barber.name}</h3>
            <p className="text-sm text-gray-600">{barber.location}</p>
            {showDetails && (
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center">
                  <BanknotesIcon className="h-3 w-3 mr-1" />
                  ${barber.revenue.toLocaleString()}
                </span>
                <span className="flex items-center">
                  <UserGroupIcon className="h-3 w-3 mr-1" />
                  {barber.customers}
                </span>
                <span className="flex items-center">
                  <StarIcon className="h-3 w-3 mr-1" />
                  {barber.rating}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Category Score */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {category === 'revenue' && `$${barber.revenue.toLocaleString()}`}
            {category === 'customers' && barber.customers}
            {category === 'rating' && barber.rating}
            {category === 'growth' && `+${barber.growth}%`}
            {category === 'overall' && barber.overallScore}
          </div>
          <div className="text-sm text-gray-600 capitalize">{category}</div>
        </div>
      </div>
      
      {/* Achievement Badges */}
      {barber.achievements && barber.achievements.length > 0 && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-600 mr-2">Recent:</span>
          {barber.achievements.slice(0, 3).map((achievement, idx) => (
            <AchievementBadge key={idx} achievement={achievement} earned={true} size="small" />
          ))}
        </div>
      )}
    </Card>
  )
}

// AI Coaching Insights Widget
function AICoachingInsights({ selectedBarber }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCoachingInsights = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/ai/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Provide personalized coaching insights and improvement recommendations for ${selectedBarber ? selectedBarber.name : 'the team'} to help them achieve their next performance milestone`,
            businessContext: {
              focus_barber: selectedBarber,
              coaching_type: 'gamified_improvement',
              analysis_areas: ['performance_gaps', 'achievement_path', 'competitive_edge'],
              mentorship_style: 'six_figure_barber'
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          setInsights(data)
        }
      } catch (error) {
        console.error('AI Coaching insights error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCoachingInsights()
  }, [selectedBarber])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <AcademicCapIcon className="h-5 w-5 mr-2 text-olive-600" />
          AI Performance Coaching
        </h3>
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-4 w-4 text-olive-600" />
          <span className="text-sm text-olive-600">Six Figure Barber AI</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <LightBulbIcon className="h-4 w-4 text-olive-600 mr-2" />
              <span className="text-sm font-medium text-indigo-800">
                Personalized Coaching - {selectedBarber ? selectedBarber.name : 'Team Focus'}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">
              {insights.response?.substring(0, 180)}...
            </p>
            
            {insights.agent_details?.recommendations && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-indigo-800">🎯 Next Level Actions:</h4>
                {insights.agent_details.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="bg-white rounded-lg p-3 border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-olive-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 mb-1">
                          {rec.length > 80 ? rec.substring(0, 80) + '...' : rec}
                        </div>
                        <div className="text-xs text-olive-600">
                          💡 Focus Area • Expected Impact: High
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedBarber && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">🏆 Achievement Path</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Level:</span>
                  <span className="font-medium">
                    {selectedBarber.overallScore >= 90 ? 'Elite' :
                     selectedBarber.overallScore >= 80 ? 'Expert' :
                     selectedBarber.overallScore >= 70 ? 'Advanced' : 'Rising'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Next Milestone:</span>
                  <span className="font-medium text-yellow-700">
                    {selectedBarber.overallScore < 70 ? 'Advanced' :
                     selectedBarber.overallScore < 80 ? 'Expert' :
                     selectedBarber.overallScore < 90 ? 'Elite' : 'Master'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <AcademicCapIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading AI coaching insights...</p>
        </div>
      )}
    </Card>
  )
}

// Gamification Progress Component  
function GamificationProgress({ barber }) {
  const achievements = [
    { name: 'Revenue Rockstar', icon: '💰', description: '$15K+ monthly revenue', earned: barber.revenue >= 15000 },
    { name: 'Customer Magnet', icon: '🧲', description: '100+ regular customers', earned: barber.customers >= 100 },
    { name: 'Five Star Master', icon: '⭐', description: '4.8+ average rating', earned: barber.rating >= 4.8 },
    { name: 'Growth Champion', icon: '📈', description: '20%+ growth rate', earned: barber.growth >= 20 },
    { name: 'Consistency King', icon: '👑', description: 'Top 3 for 3 months', earned: barber.consistent },
    { name: 'Team Player', icon: '🤝', description: 'Mentors other barbers', earned: barber.mentor },
    { name: 'Innovation Leader', icon: '💡', description: 'Introduces new techniques', earned: barber.innovative },
    { name: 'Customer Favorite', icon: '❤️', description: '90%+ retention rate', earned: barber.retention >= 90 }
  ]

  const level = Math.floor(barber.overallScore / 20) + 1
  const currentLevelProgress = (barber.overallScore % 20) * 5
  const earnedCount = achievements.filter(a => a.earned).length

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BoltIcon className="h-5 w-5 mr-2 text-gold-600" />
          {barber.name}'s Progress
        </h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-gold-600">Level {level}</div>
          <div className="text-xs text-gold-500">{earnedCount}/8 achievements</div>
        </div>
      </div>

      {/* Level Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Progress to Next Level</span>
          <span className="text-sm font-medium text-gold-600">{currentLevelProgress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-gold-500 to-pink-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${currentLevelProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-800 flex items-center">
          <TrophyIcon className="h-4 w-4 mr-2" />
          Achievements ({earnedCount}/8)
        </h4>
        <div className="grid grid-cols-4 gap-3">
          {achievements.map((achievement, idx) => (
            <AchievementBadge 
              key={idx} 
              achievement={achievement} 
              earned={achievement.earned}
              size="medium"
            />
          ))}
        </div>
      </div>

      {/* Next Achievement */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="bg-gold-50 border border-gold-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gold-800 mb-2">🎯 Next Achievement</h4>
          {(() => {
            const nextAchievement = achievements.find(a => !a.earned)
            return nextAchievement ? (
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{nextAchievement.icon}</span>
                <div>
                  <div className="text-sm font-medium text-gray-900">{nextAchievement.name}</div>
                  <div className="text-xs text-gray-600">{nextAchievement.description}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gold-700">🏆 All achievements unlocked! Master level reached!</div>
            )
          })()}
        </div>
      </div>
    </Card>
  )
}

// Main Leaderboard Component
function GamifiedLeaderboard() {
  const [activeCategory, setActiveCategory] = useState('overall')
  const [selectedBarber, setSelectedBarber] = useState(null)

  // Database data
  const barberData = [
    {
      id: 1,
      name: 'Marcus Johnson',
      location: 'Downtown Elite',
      revenue: 15000,
      customers: 125,
      rating: 4.9,
      growth: 25,
      overallScore: 92,
      consistent: true,
      mentor: true,
      innovative: true,
      retention: 94,
      achievements: [
        { name: 'Revenue Rockstar', icon: '💰', description: '$15K+ monthly' },
        { name: 'Five Star Master', icon: '⭐', description: '4.8+ rating' },
        { name: 'Growth Champion', icon: '📈', description: '20%+ growth' }
      ]
    },
    {
      id: 2,
      name: 'David Chen', 
      location: 'Midtown Barber Co',
      revenue: 14200,
      customers: 118,
      rating: 4.8,
      growth: 18,
      overallScore: 88,
      consistent: true,
      mentor: false,
      innovative: true,
      retention: 91,
      achievements: [
        { name: 'Revenue Rockstar', icon: '💰', description: '$15K+ monthly' },
        { name: 'Customer Magnet', icon: '🧲', description: '100+ customers' }
      ]
    },
    {
      id: 3,
      name: 'Alex Rodriguez',
      location: 'Westside Style',
      revenue: 12800,
      customers: 106,
      rating: 4.7,
      growth: 22,
      overallScore: 85,
      consistent: false,
      mentor: true,
      innovative: false,
      retention: 88,
      achievements: [
        { name: 'Growth Champion', icon: '📈', description: '20%+ growth' },
        { name: 'Customer Magnet', icon: '🧲', description: '100+ customers' }
      ]
    },
    {
      id: 4,
      name: 'Sarah Williams',
      location: 'Eastside Cuts',
      revenue: 11500,
      customers: 95,
      rating: 4.8,
      growth: 15,
      overallScore: 82,
      consistent: false,
      mentor: false,
      innovative: true,
      retention: 92,
      achievements: [
        { name: 'Five Star Master', icon: '⭐', description: '4.8+ rating' }
      ]
    },
    {
      id: 5,
      name: 'Tommy Rodriguez',
      location: 'Downtown Elite',
      revenue: 10200,
      customers: 89,
      rating: 4.6,
      growth: 12,
      overallScore: 78,
      consistent: false,
      mentor: false,
      innovative: false,
      retention: 85,
      achievements: []
    }
  ]

  const categories = [
    { id: 'overall', name: 'Overall Performance', icon: TrophyIcon },
    { id: 'revenue', name: 'Revenue Leaders', icon: BanknotesIcon },
    { id: 'customers', name: 'Customer Champions', icon: UserGroupIcon },
    { id: 'rating', name: 'Five Star Masters', icon: StarIcon },
    { id: 'growth', name: 'Growth Rockstars', icon: ArrowTrendingUpIcon }
  ]

  const getSortedBarbers = useCallback((category) => {
    return [...barberData].sort((a, b) => {
      switch (category) {
        case 'revenue': return b.revenue - a.revenue
        case 'customers': return b.customers - a.customers
        case 'rating': return b.rating - a.rating
        case 'growth': return b.growth - a.growth
        case 'overall':
        default: return b.overallScore - a.overallScore
      }
    })
  }, [barberData])

  const sortedBarbers = getSortedBarbers(activeCategory)

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <TrophyIcon className="h-8 w-8 mr-3 text-amber-800" />
          Gamified Leaderboards & Coaching
        </h1>
        <p className="text-gray-600 mt-2">
          Performance rankings, achievements, and AI-powered coaching insights
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-gradient-to-r from-gold-50 to-pink-50 rounded-xl border border-gold-200">
        {categories.map((category) => {
          const IconComponent = category.icon
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                activeCategory === category.id
                  ? 'bg-gold-700 text-charcoal-800 shadow-lg transform scale-105'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <IconComponent className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Leaderboard Rankings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <FireIcon className="h-5 w-5 mr-2 text-red-500" />
              {categories.find(c => c.id === activeCategory)?.name} Rankings
            </h2>
            <div className="text-sm text-gray-600">
              Updated: {new Date().toLocaleDateString()}
            </div>
          </div>
          
          {sortedBarbers.map((barber, index) => (
            <div 
              key={barber.id}
              onClick={() => setSelectedBarber(barber)}
              className="cursor-pointer"
            >
              <LeaderboardRank 
                rank={index + 1}
                barber={barber}
                category={activeCategory}
                showDetails={true}
              />
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Coaching Insights */}
          <AICoachingInsights selectedBarber={selectedBarber} />
          
          {/* Individual Progress (when barber selected) */}
          {selectedBarber && (
            <GamificationProgress barber={selectedBarber} />
          )}
          
          {/* Team Stats */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-green-600" />
              Team Performance Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Team Revenue</span>
                <span className="font-semibold text-green-600">
                  ${barberData.reduce((sum, b) => sum + b.revenue, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Average Rating</span>
                <span className="font-semibold text-amber-800">
                  {(barberData.reduce((sum, b) => sum + b.rating, 0) / barberData.length).toFixed(1)} ⭐
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Customers</span>
                <span className="font-semibold text-olive-600">
                  {barberData.reduce((sum, b) => sum + b.customers, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Top Performers</span>
                <span className="font-semibold text-gold-600">
                  {barberData.filter(b => b.overallScore >= 80).length}/5
                </span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <RocketLaunchIcon className="h-5 w-5 mr-2 text-olive-600" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button className="w-full bg-indigo-50 hover:bg-indigo-100 text-olive-700 px-3 py-2 rounded-lg text-sm text-left transition-colors">
                🎯 Launch team coaching session
              </button>
              <button className="w-full bg-green-50 hover:bg-moss-100 text-moss-800 px-3 py-2 rounded-lg text-sm text-left transition-colors">
                📊 Generate performance report
              </button>
              <button className="w-full bg-gold-50 hover:bg-gold-100 text-gold-700 px-3 py-2 rounded-lg text-sm text-left transition-colors">
                🏆 Create achievement challenge
              </button>
              <button className="w-full bg-yellow-50 hover:bg-amber-100 text-amber-900 px-3 py-2 rounded-lg text-sm text-left transition-colors">
                💡 AI improvement recommendations
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function GamifiedLeaderboardPage() {
  return (
    <ProtectedRoute>
      <GamifiedLeaderboard />
    </ProtectedRoute>
  )
}