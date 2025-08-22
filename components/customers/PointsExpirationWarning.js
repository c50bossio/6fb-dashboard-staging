'use client'

import React, { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Star,
  X,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Badge } from '../ui/badge'

/**
 * PointsExpirationWarning Component
 * 
 * Shows warnings for points that are expiring soon
 * Provides detailed breakdown and quick action suggestions
 */
export default function PointsExpirationWarning({ 
  customerId, 
  barbershopId, 
  programId = null,
  threshold = 30, // Days before expiration to show warning
  className = ''
}) {
  const [expiringPoints, setExpiringPoints] = useState([])
  const [totalExpiringPoints, setTotalExpiringPoints] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDetails, setShowDetails] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Fetch points that are expiring soon
  const fetchExpiringPoints = async () => {
    try {
      setLoading(true)
      setError(null)

      // Get user session
      const userResponse = await fetch('/api/auth/user')
      const userData = await userResponse.json()
      
      if (!userData.authenticated) {
        return
      }

      // Fetch points history to check for expiring points
      const historyUrl = new URL('/api/customers/loyalty/points', window.location.origin)
      historyUrl.searchParams.set('customer_id', customerId)
      historyUrl.searchParams.set('action', 'history')
      historyUrl.searchParams.set('limit', '100') // Get more history to check expirations
      if (programId) historyUrl.searchParams.set('program_id', programId)

      const historyResponse = await fetch(historyUrl, {
        headers: {
          'Authorization': `Bearer ${userData.session?.access_token || ''}`
        }
      })

      if (historyResponse.ok) {
        const historyData = await historyResponse.json()
        
        if (historyData.success) {
          const transactions = historyData.transactions || []
          
          // Filter for points that are expiring within threshold days
          const now = new Date()
          const thresholdDate = new Date(now.getTime() + (threshold * 24 * 60 * 60 * 1000))
          
          const expiring = transactions.filter(transaction => {
            if (transaction.expires_at && transaction.points_amount > 0 && !transaction.is_expired) {
              const expiryDate = new Date(transaction.expires_at)
              return expiryDate <= thresholdDate && expiryDate > now
            }
            return false
          })

          // Group by expiry date
          const groupedExpiring = expiring.reduce((groups, transaction) => {
            const expiryDate = new Date(transaction.expires_at).toDateString()
            if (!groups[expiryDate]) {
              groups[expiryDate] = []
            }
            groups[expiryDate].push(transaction)
            return groups
          }, {})

          // Sort by expiry date
          const sortedGroups = Object.keys(groupedExpiring)
            .sort((a, b) => new Date(a) - new Date(b))
            .map(date => ({
              date,
              transactions: groupedExpiring[date],
              totalPoints: groupedExpiring[date].reduce((sum, t) => sum + t.points_amount, 0),
              daysUntilExpiry: Math.ceil((new Date(date) - now) / (24 * 60 * 60 * 1000))
            }))

          setExpiringPoints(sortedGroups)
          setTotalExpiringPoints(expiring.reduce((sum, t) => sum + t.points_amount, 0))
        }
      }

    } catch (err) {
      console.error('Error fetching expiring points:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get urgency level and styling
  const getUrgencyLevel = (daysUntilExpiry) => {
    if (daysUntilExpiry <= 3) return {
      level: 'critical',
      color: 'bg-red-50 border-red-200 text-red-800',
      badgeColor: 'bg-red-100 text-red-800',
      icon: AlertTriangle,
      message: 'Expiring very soon!'
    }
    if (daysUntilExpiry <= 7) return {
      level: 'high',
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      badgeColor: 'bg-orange-100 text-orange-800',
      icon: AlertTriangle,
      message: 'Expiring soon'
    }
    if (daysUntilExpiry <= 14) return {
      level: 'medium',
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      badgeColor: 'bg-yellow-100 text-yellow-800',
      icon: Clock,
      message: 'Expiring in 2 weeks'
    }
    return {
      level: 'low',
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      badgeColor: 'bg-blue-100 text-blue-800',
      icon: Calendar,
      message: 'Expiring this month'
    }
  }

  // Format date for display
  const formatExpiryDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays <= 7) return `In ${diffDays} days`
    
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  useEffect(() => {
    fetchExpiringPoints()
  }, [customerId, barbershopId, programId, threshold])

  if (loading || error || dismissed || totalExpiringPoints === 0) {
    return null
  }

  // Get the most urgent expiring points group
  const mostUrgent = expiringPoints[0]
  const urgency = getUrgencyLevel(mostUrgent.daysUntilExpiry)
  const UrgencyIcon = urgency.icon

  return (
    <div className={`rounded-lg border p-4 ${urgency.color} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <UrgencyIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-medium">Points Expiring Soon</h4>
              <Badge className={urgency.badgeColor}>
                {urgency.message}
              </Badge>
            </div>
            
            <p className="text-sm mb-2">
              <span className="font-semibold">{totalExpiringPoints.toLocaleString()} points</span> 
              {' '}will expire within the next {threshold} days
            </p>

            {/* Most urgent group preview */}
            <div className="text-sm">
              <span className="font-medium">{mostUrgent.totalPoints.toLocaleString()} points</span>
              {' '}expire {formatExpiryDate(mostUrgent.date)}
              {expiringPoints.length > 1 && (
                <span className="text-xs ml-2">
                  (+{expiringPoints.length - 1} more group{expiringPoints.length > 2 ? 's' : ''})
                </span>
              )}
            </div>

            {/* Action suggestion */}
            <div className="mt-3 flex items-center space-x-2">
              <button className="text-xs underline hover:no-underline">
                View available rewards
              </button>
              <span className="text-xs">•</span>
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs underline hover:no-underline flex items-center"
              >
                {showDetails ? 'Hide' : 'Show'} details
                {showDetails ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </button>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setDismissed(true)}
          className="p-1 hover:bg-black/10 rounded"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Detailed breakdown */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-current/20">
          <h5 className="text-sm font-medium mb-3">Expiration Schedule</h5>
          <div className="space-y-2">
            {expiringPoints.map((group, index) => {
              const groupUrgency = getUrgencyLevel(group.daysUntilExpiry)
              return (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      groupUrgency.level === 'critical' ? 'bg-red-500' :
                      groupUrgency.level === 'high' ? 'bg-orange-500' :
                      groupUrgency.level === 'medium' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span>{formatExpiryDate(group.date)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Star className="h-3 w-3" />
                    <span className="font-medium">{group.totalPoints.toLocaleString()}</span>
                    <span className="text-xs text-current/70">
                      ({group.transactions.length} transaction{group.transactions.length > 1 ? 's' : ''})
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="mt-4 pt-3 border-t border-current/20">
            <p className="text-xs text-current/80 mb-2">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                Book an appointment
              </button>
              <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                Browse rewards
              </button>
              <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded">
                Share with friends
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * PointsExpirationBadge Component
 * 
 * Compact version for showing in customer cards or summaries
 */
export function PointsExpirationBadge({ 
  customerId, 
  barbershopId, 
  programId = null,
  threshold = 30,
  onClick = null
}) {
  const [expiringCount, setExpiringCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const userResponse = await fetch('/api/auth/user')
        const userData = await userResponse.json()
        
        if (!userData.authenticated) return

        const historyUrl = new URL('/api/customers/loyalty/points', window.location.origin)
        historyUrl.searchParams.set('customer_id', customerId)
        historyUrl.searchParams.set('action', 'history')
        historyUrl.searchParams.set('limit', '50')
        if (programId) historyUrl.searchParams.set('program_id', programId)

        const historyResponse = await fetch(historyUrl, {
          headers: { 'Authorization': `Bearer ${userData.session?.access_token || ''}` }
        })

        if (historyResponse.ok) {
          const historyData = await historyResponse.json()
          
          if (historyData.success) {
            const transactions = historyData.transactions || []
            const now = new Date()
            const thresholdDate = new Date(now.getTime() + (threshold * 24 * 60 * 60 * 1000))
            
            const expiringPoints = transactions.filter(transaction => {
              if (transaction.expires_at && transaction.points_amount > 0 && !transaction.is_expired) {
                const expiryDate = new Date(transaction.expires_at)
                return expiryDate <= thresholdDate && expiryDate > now
              }
              return false
            })

            const totalExpiring = expiringPoints.reduce((sum, t) => sum + t.points_amount, 0)
            setExpiringCount(totalExpiring)
          }
        }
      } catch (err) {
        console.error('Error fetching expiring points count:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [customerId, barbershopId, programId, threshold])

  if (loading || expiringCount === 0) {
    return null
  }

  const urgencyLevel = expiringCount > 1000 ? 'high' : 'medium'
  const badgeColor = urgencyLevel === 'high' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${badgeColor} hover:opacity-80`}
    >
      <AlertTriangle className="h-3 w-3" />
      <span>{expiringCount.toLocaleString()} expiring</span>
    </button>
  )
}