'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  StarIcon,
  GiftIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrophyIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardTitle, CardContent, Badge } from '../ui'
import { useAuth } from '../SupabaseAuthProvider'

// Timeline Event Component
const TimelineEvent = ({ event, isLast }) => {
  const getEventIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <CalendarDaysIcon className="h-5 w-5" />
      case 'campaign':
        return <EnvelopeIcon className="h-5 w-5" />
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5" />
      case 'call':
        return <PhoneIcon className="h-5 w-5" />
      case 'review':
        return <StarIcon className="h-5 w-5" />
      case 'loyalty':
        return <GiftIcon className="h-5 w-5" />
      case 'milestone':
        return <TrophyIcon className="h-5 w-5" />
      case 'signup':
        return <UserIcon className="h-5 w-5" />
      default:
        return <ClockIcon className="h-5 w-5" />
    }
  }

  const getEventColor = (type) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-600 border-blue-200'
      case 'campaign':
      case 'sms':
        return 'bg-green-100 text-green-600 border-green-200'
      case 'call':
        return 'bg-purple-100 text-purple-600 border-purple-200'
      case 'review':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      case 'loyalty':
        return 'bg-pink-100 text-pink-600 border-pink-200'
      case 'milestone':
        return 'bg-gold-100 text-gold-600 border-gold-200'
      case 'signup':
        return 'bg-indigo-100 text-indigo-600 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="relative flex">
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${getEventColor(event.event_type)}`}>
          {getEventIcon(event.event_type)}
        </div>
        {!isLast && <div className="h-full w-0.5 bg-gray-200 mt-2"></div>}
      </div>

      {/* Event content */}
      <div className="flex-1 ml-4 pb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900">{event.event_title}</h4>
              <p className="text-sm text-gray-600 mt-1">{event.event_description}</p>
              
              {/* Event metadata */}
              {event.metadata && (
                <div className="mt-2 space-y-1">
                  {event.metadata.service && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      Service: {event.metadata.service}
                    </span>
                  )}
                  {event.metadata.barber && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">
                      Barber: {event.metadata.barber}
                    </span>
                  )}
                  {event.metadata.rating && (
                    <span className="inline-block text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded ml-2">
                      Rating: {event.metadata.rating}/5
                    </span>
                  )}
                  {event.metadata.points_earned && (
                    <span className="inline-block text-xs bg-pink-100 text-pink-700 px-2 py-1 rounded ml-2">
                      +{event.metadata.points_earned} points
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">{formatDate(event.event_timestamp)}</p>
              {event.engagement_score && (
                <div className="mt-1">
                  <Badge className="text-xs">
                    Engagement: {event.engagement_score}%
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Milestone Component
const MilestoneCard = ({ milestone }) => {
  const getMilestoneIcon = (type) => {
    switch (type) {
      case 'first_visit':
        return <UserIcon className="h-6 w-6" />
      case 'loyalty_tier':
        return <TrophyIcon className="h-6 w-6" />
      case 'spending_milestone':
        return <StarIcon className="h-6 w-6" />
      case 'review_milestone':
        return <HeartIcon className="h-6 w-6" />
      default:
        return <CheckCircleIcon className="h-6 w-6" />
    }
  }

  return (
    <div className="bg-gradient-to-r from-gold-50 to-yellow-50 border border-gold-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 p-2 bg-gold-100 rounded-full text-gold-600">
          {getMilestoneIcon(milestone.milestone_type)}
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{milestone.milestone_name}</h4>
          <p className="text-sm text-gray-600">{milestone.milestone_description}</p>
          <p className="text-xs text-gray-500 mt-1">
            Achieved: {new Date(milestone.achieved_at).toLocaleDateString()}
          </p>
        </div>
        {milestone.reward && (
          <div className="text-right">
            <Badge className="bg-gold-100 text-gold-800">
              {milestone.reward}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}

// Journey Stage Progress Component
const JourneyStageProgress = ({ stages, currentStage }) => {
  const stageOrder = ['awareness', 'consideration', 'first_visit', 'regular', 'loyal', 'advocate']
  const currentIndex = stageOrder.indexOf(currentStage)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Journey Progress</h3>
      <div className="relative">
        <div className="flex items-center justify-between">
          {stageOrder.map((stage, index) => {
            const isActive = index <= currentIndex
            const isCurrent = index === currentIndex
            
            return (
              <div key={stage} className="flex flex-col items-center">
                <div className={`
                  h-10 w-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${isActive 
                    ? 'bg-olive-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                  }
                  ${isCurrent ? 'ring-4 ring-olive-200' : ''}
                `}>
                  {index + 1}
                </div>
                <span className={`
                  mt-2 text-xs text-center capitalize
                  ${isActive ? 'text-olive-600 font-medium' : 'text-gray-500'}
                `}>
                  {stage.replace('_', ' ')}
                </span>
              </div>
            )
          })}
        </div>
        
        {/* Progress line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-10">
          <div 
            className="h-full bg-olive-600 transition-all duration-500"
            style={{ width: `${(currentIndex / (stageOrder.length - 1)) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  )
}

export default function CustomerJourneyVisualizer({ customerId }) {
  const { user, profile } = useAuth()
  const [journeyData, setJourneyData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState(365)

  // Fetch customer journey data
  useEffect(() => {
    if (!user || !profile?.barbershop_id || !customerId) return

    const fetchJourneyData = async () => {
      try {
        setLoading(true)
        const baseUrl = process.env.NODE_ENV === 'production' 
          ? 'https://your-api-domain.com'
          : 'http://localhost:8001'

        const token = await user.getIdToken()

        const response = await fetch(
          `${baseUrl}/customer-journey/${customerId}?days_back=${selectedTimeframe}&include_events=true&include_touchpoints=true&include_milestones=true`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch customer journey data')
        }

        const data = await response.json()
        setJourneyData(data)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching journey data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchJourneyData()
  }, [user, profile?.barbershop_id, customerId, selectedTimeframe])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Journey</h3>
          <p className="text-gray-600">{error}</p>
        </div>
      </Card>
    )
  }

  if (!journeyData) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Journey Data</h3>
          <p className="text-gray-600">No journey data available for this customer</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with timeframe selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Customer Journey</h2>
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md bg-white"
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 3 months</option>
          <option value={180}>Last 6 months</option>
          <option value={365}>Last year</option>
          <option value={0}>All time</option>
        </select>
      </div>

      {/* Journey Stage Progress */}
      <JourneyStageProgress 
        stages={journeyData.engagement_timeline} 
        currentStage={journeyData.lifecycle_stage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline Events */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Timeline & Touchpoints</CardTitle>
            </CardHeader>
            <CardContent>
              {journeyData.journey_events && journeyData.journey_events.length > 0 ? (
                <div className="space-y-2">
                  {journeyData.journey_events.map((event, index) => (
                    <TimelineEvent
                      key={event.id || index}
                      event={event}
                      isLast={index === journeyData.journey_events.length - 1}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No timeline events available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar with Milestones and Stats */}
        <div className="space-y-6">
          {/* Milestones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrophyIcon className="h-5 w-5" />
                Milestones
              </CardTitle>
            </CardHeader>
            <CardContent>
              {journeyData.milestones && journeyData.milestones.length > 0 ? (
                <div className="space-y-3">
                  {journeyData.milestones.map((milestone, index) => (
                    <MilestoneCard key={milestone.id || index} milestone={milestone} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No milestones achieved yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Journey Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Journey Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Events</span>
                  <span className="font-medium">
                    {journeyData.journey_events?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Touchpoints</span>
                  <span className="font-medium">
                    {journeyData.touchpoints?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Milestones</span>
                  <span className="font-medium">
                    {journeyData.milestones?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Stage</span>
                  <Badge className="text-xs capitalize">
                    {journeyData.lifecycle_stage?.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conversions</span>
                  <span className="font-medium">
                    {journeyData.conversion_events?.length || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 text-sm bg-olive-600 text-white rounded-md hover:bg-olive-700">
                  Send Message
                </button>
                <button className="w-full px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Book Appointment
                </button>
                <button className="w-full px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  Add Note
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}