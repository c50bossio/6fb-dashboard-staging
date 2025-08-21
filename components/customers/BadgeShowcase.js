'use client'

import React, { useState, useEffect } from 'react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { getBadgeRarityStyle, getBadgeCategoryInfo, sortBadgesByImportance, groupBadgesByCategory } from '../../utils/badgeSystem'
import { Trophy, Star, Award, Gift, Calendar, Share2, Filter, Grid, List } from 'lucide-react'
// Using simple alert instead of toast for now

const categoryIcons = {
  loyalty: Trophy,
  milestone: Star,
  spending: Award,
  special: Gift,
  seasonal: Calendar
}

const viewModes = {
  grid: { icon: Grid, label: 'Grid' },
  list: { icon: List, label: 'List' }
}

export default function BadgeShowcase({ 
  customerId, 
  barbershopId,
  badges = [],
  title = "Badge Collection",
  showCustomerName = false,
  customerName = "",
  allowSharing = true,
  interactive = true,
  defaultViewMode = 'grid',
  showStatistics = true
}) {
  const [filteredBadges, setFilteredBadges] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRarity, setSelectedRarity] = useState('all')
  const [sortBy, setSortBy] = useState('rarity')
  const [viewMode, setViewMode] = useState(defaultViewMode)
  const [selectedBadge, setSelectedBadge] = useState(null)

  // Process and filter badges
  useEffect(() => {
    let processed = [...badges]

    // Apply category filter
    if (selectedCategory !== 'all') {
      processed = processed.filter(badge => badge.category === selectedCategory)
    }

    // Apply rarity filter
    if (selectedRarity !== 'all') {
      processed = processed.filter(badge => badge.rarity === selectedRarity)
    }

    // Apply sorting
    switch (sortBy) {
      case 'rarity':
        processed = sortBadgesByImportance(processed)
        break
      case 'date':
        processed = processed.sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at))
        break
      case 'alphabetical':
        processed = processed.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'points':
        processed = processed.sort((a, b) => b.points - a.points)
        break
      default:
        break
    }

    setFilteredBadges(processed)
  }, [badges, selectedCategory, selectedRarity, sortBy])

  // Calculate statistics
  const statistics = {
    total: badges.length,
    totalPoints: badges.reduce((sum, badge) => sum + badge.points, 0),
    byRarity: badges.reduce((acc, badge) => {
      acc[badge.rarity] = (acc[badge.rarity] || 0) + 1
      return acc
    }, {}),
    byCategory: groupBadgesByCategory(badges)
  }

  // Handle badge sharing
  const handleShareBadge = async (badge) => {
    try {
      const shareText = `🎉 Check out my "${badge.name}" badge! ${badge.description} #Achievement #Barbershop`
      
      if (navigator.share) {
        await navigator.share({
          title: `${badge.name} Badge`,
          text: shareText,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Badge shared to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing badge:', error)
      alert('Failed to share badge')
    }
  }

  // Handle collection sharing
  const handleShareCollection = async () => {
    try {
      const shareText = `${showCustomerName && customerName ? `${customerName}'s` : 'My'} badge collection: ${badges.length} badges earned with ${statistics.totalPoints} total points! #Achievements #Barbershop`
      
      if (navigator.share) {
        await navigator.share({
          title: 'Badge Collection',
          text: shareText,
          url: window.location.href
        })
      } else {
        await navigator.clipboard.writeText(shareText)
        alert('Collection shared to clipboard!')
      }
    } catch (error) {
      console.error('Error sharing collection:', error)
      alert('Failed to share collection')
    }
  }

  // Render badge in grid mode
  const renderBadgeGrid = (badge) => {
    const rarityStyle = getBadgeRarityStyle(badge.rarity)
    
    return (
      <Dialog key={badge.id}>
        <DialogTrigger asChild>
          <div
            className="relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              borderColor: rarityStyle.color,
              background: `linear-gradient(135deg, ${rarityStyle.color}15, ${rarityStyle.color}05)`,
              boxShadow: `0 4px 20px ${rarityStyle.glowColor}30`
            }}
          >
            {/* Badge Icon */}
            <div className="text-center mb-3">
              <span className="text-4xl animate-pulse">
                {badge.icon}
              </span>
            </div>

            {/* Badge Name */}
            <h4 className="font-semibold text-center mb-2 text-gray-900">
              {badge.name}
            </h4>

            {/* Badge Rarity & Points */}
            <div className="flex justify-between items-center">
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

            {/* Sparkles for legendary badges */}
            {badge.rarity === 'legendary' && (
              <div className="absolute -top-1 -right-1 text-yellow-400 animate-bounce">
                {'✨'.repeat(rarityStyle.sparkles)}
              </div>
            )}
          </div>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{badge.icon}</span>
              {badge.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">{badge.description}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Category</span>
                <p className="font-medium">{getBadgeCategoryInfo(badge.category).label}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Rarity</span>
                <Badge 
                  variant="outline"
                  style={{ 
                    borderColor: rarityStyle.color, 
                    color: rarityStyle.color 
                  }}
                >
                  {rarityStyle.label}
                </Badge>
              </div>
              <div>
                <span className="text-sm text-gray-500">Points</span>
                <p className="font-medium">{badge.points}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Earned</span>
                <p className="font-medium">
                  {new Date(badge.earned_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {allowSharing && (
              <Button 
                onClick={() => handleShareBadge(badge)}
                variant="outline"
                className="w-full"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share Badge
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Render badge in list mode
  const renderBadgeList = (badge) => {
    const rarityStyle = getBadgeRarityStyle(badge.rarity)
    
    return (
      <div
        key={badge.id}
        className="flex items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
        style={{ borderLeftColor: rarityStyle.color, borderLeftWidth: '4px' }}
      >
        <span className="text-2xl mr-4">{badge.icon}</span>
        
        <div className="flex-grow">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold">{badge.name}</h4>
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
          </div>
          <p className="text-sm text-gray-600 mb-1">{badge.description}</p>
          <p className="text-xs text-gray-500">
            Earned {new Date(badge.earned_at).toLocaleDateString()} • {badge.points} points
          </p>
        </div>

        {allowSharing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShareBadge(badge)}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  if (badges.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Badges Yet</h3>
          <p className="text-gray-600">
            Start your journey and earn your first achievement badge!
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {showCustomerName && customerName && (
            <p className="text-gray-600">{customerName}</p>
          )}
        </div>
        
        {allowSharing && (
          <Button variant="outline" onClick={handleShareCollection}>
            <Share2 className="w-4 h-4 mr-2" />
            Share Collection
          </Button>
        )}
      </div>

      {/* Statistics */}
      {showStatistics && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                <div className="text-sm text-gray-600">Total Badges</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{statistics.totalPoints}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {statistics.byRarity.legendary || 0}
                </div>
                <div className="text-sm text-gray-600">Legendary</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {Object.keys(statistics.byCategory).length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Controls */}
      {interactive && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryIcons).map(([key, Icon]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedRarity} onValueChange={setSelectedRarity}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Rarity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rarities</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="date">Date Earned</SelectItem>
                    <SelectItem value="alphabetical">Name</SelectItem>
                    <SelectItem value="points">Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {Object.entries(viewModes).map(([mode, { icon: Icon, label }]) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badge Display */}
      <Card>
        <CardContent className="pt-6">
          {filteredBadges.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBadges.map(renderBadgeGrid)}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBadges.map(renderBadgeList)}
              </div>
            )
          ) : (
            <div className="text-center py-8">
              <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No badges match your current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}