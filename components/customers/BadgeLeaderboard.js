'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { getBadgeRarityStyle, BADGE_CATEGORIES } from '../../utils/badgeSystem'
import { 
  Trophy, Crown, Star, Award, Users, TrendingUp, 
  Calendar, Filter, RefreshCw, Share2, Medal
} from 'lucide-react'
// Using simple alert instead of toast

const timeframeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'month', label: 'This Month' },
  { value: 'week', label: 'This Week' }
]

const categoryOptions = [
  { value: 'all', label: 'All Categories' },
  ...Object.entries(BADGE_CATEGORIES).map(([key, category]) => ({
    value: category.value,
    label: category.label
  }))
]

export default function BadgeLeaderboard({ 
  barbershopId,
  defaultTimeframe = 'all',
  defaultCategory = 'all',
  defaultLimit = 20,
  showFilters = true,
  showStatistics = true,
  allowSharing = true,
  onCustomerSelect = null
}) {
  const [leaderboard, setLeaderboard] = useState([])
  const [statistics, setStatistics] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Filter states
  const [timeframe, setTimeframe] = useState(defaultTimeframe)
  const [category, setCategory] = useState(defaultCategory)
  const [limit, setLimit] = useState(defaultLimit)
  const [viewMode, setViewMode] = useState('list') // list, cards

  // Fetch leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setError(null)
      
      const params = new URLSearchParams({
        limit: limit.toString(),
        timeframe,
        category
      })
      if (barbershopId) params.append('barbershop_id', barbershopId)

      const response = await fetch(`/api/customers/badges/leaderboard?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch leaderboard')
      }

      setLeaderboard(data.leaderboard || [])
      setStatistics(data.statistics || {})

    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Refresh leaderboard
  const refreshLeaderboard = async () => {
    setRefreshing(true)
    await fetchLeaderboard()
  }

  // Share leaderboard
  const handleShare = async () => {
    try {
      const shareText = `🏆 Badge Leaderboard (${timeframeOptions.find(t => t.value === timeframe)?.label})\n\nTop performers:\n${
        leaderboard.slice(0, 3).map((customer, index) => 
          `${index + 1}. ${customer.name} - ${customer.totalBadges} badges (${customer.totalPoints} pts)`
        ).join('\n')
      }\n\n#BadgeLeaderboard #Achievements`
      
      if (navigator.share) {
        await navigator.share({
          title: 'Badge Leaderboard',
          text: shareText,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Leaderboard copied to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing leaderboard:', error)
      alert('Failed to share leaderboard')
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [timeframe, category, limit, barbershopId])

  // Render rank medal/icon
  const renderRankIcon = (rank) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>
    if (rank === 2) return <span className="text-2xl">🥈</span>
    if (rank === 3) return <span className="text-2xl">🥉</span>
    return (
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-sm font-bold">
        {rank}
      </div>
    )
  }

  // Render customer in list mode
  const renderCustomerList = (customer) => {
    return (
      <div
        key={customer.customer_id}
        className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${
          customer.rank <= 3 ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'
        }`}
        onClick={() => onCustomerSelect && onCustomerSelect(customer)}
      >
        <div className="flex items-center space-x-4">
          {renderRankIcon(customer.rank)}
          
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{customer.name}</h4>
              {customer.rank === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{customer.totalBadges} badges</span>
              <span>{customer.totalPoints} points</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Rarity Breakdown */}
          <div className="flex space-x-1">
            {customer.rarityBreakdown.legendary > 0 && (
              <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                {customer.rarityBreakdown.legendary} L
              </Badge>
            )}
            {customer.rarityBreakdown.epic > 0 && (
              <Badge variant="outline" className="text-xs border-purple-500 text-purple-700">
                {customer.rarityBreakdown.epic} E
              </Badge>
            )}
            {customer.rarityBreakdown.rare > 0 && (
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                {customer.rarityBreakdown.rare} R
              </Badge>
            )}
          </div>

          {/* Points Display */}
          <div className="text-right">
            <div className="text-lg font-bold text-blue-600">{customer.totalPoints}</div>
            <div className="text-xs text-gray-500">points</div>
          </div>
        </div>
      </div>
    )
  }

  // Render customer in card mode
  const renderCustomerCard = (customer) => {
    return (
      <Card
        key={customer.customer_id}
        className={`cursor-pointer transition-all hover:shadow-lg ${
          customer.rank <= 3 ? 'ring-2 ring-yellow-300' : ''
        }`}
        onClick={() => onCustomerSelect && onCustomerSelect(customer)}
      >
        <CardContent className="p-4">
          <div className="text-center">
            <div className="mb-3">
              {renderRankIcon(customer.rank)}
            </div>
            
            <h4 className="font-semibold text-gray-900 mb-1">
              {customer.name}
              {customer.rank === 1 && <Crown className="w-4 h-4 text-yellow-500 inline ml-1" />}
            </h4>
            
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <div className="text-xl font-bold text-gray-900">{customer.totalBadges}</div>
                <div className="text-xs text-gray-500">Badges</div>
              </div>
              <div>
                <div className="text-xl font-bold text-blue-600">{customer.totalPoints}</div>
                <div className="text-xs text-gray-500">Points</div>
              </div>
            </div>

            {/* Rarity Breakdown */}
            <div className="flex justify-center space-x-1 mt-3">
              {customer.rarityBreakdown.legendary > 0 && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">
                  {customer.rarityBreakdown.legendary} L
                </Badge>
              )}
              {customer.rarityBreakdown.epic > 0 && (
                <Badge variant="outline" className="text-xs border-purple-500 text-purple-700">
                  {customer.rarityBreakdown.epic} E
                </Badge>
              )}
              {customer.rarityBreakdown.rare > 0 && (
                <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                  {customer.rarityBreakdown.rare} R
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
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
          <Button onClick={fetchLeaderboard} variant="outline">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Badge Leaderboard
          </h2>
          <p className="text-gray-600">Top customers by badges earned and points</p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshLeaderboard}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          {allowSharing && (
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      {showStatistics && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{statistics.total_customers || 0}</div>
                <div className="text-sm text-gray-600">Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{statistics.total_badges_earned || 0}</div>
                <div className="text-sm text-gray-600">Badges Earned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{statistics.total_points_awarded || 0}</div>
                <div className="text-sm text-gray-600">Points Awarded</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">{statistics.average_badges_per_customer || 0}</div>
                <div className="text-sm text-gray-600">Avg per Customer</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeframeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
                <Button
                  variant={viewMode === 'cards' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  Cards
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Medal className="w-5 h-5" />
            Rankings
            <Badge variant="outline" className="ml-2">
              {timeframeOptions.find(t => t.value === timeframe)?.label} • {categoryOptions.find(c => c.value === category)?.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.length > 0 ? (
            viewMode === 'list' ? (
              <div className="space-y-3">
                {leaderboard.map(renderCustomerList)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {leaderboard.map(renderCustomerCard)}
              </div>
            )
          ) : (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">
                No customers have earned badges in the selected timeframe and category.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}