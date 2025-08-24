'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'
import { 
  MessageSquare,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  Bell,
  RefreshCw,
  Calendar,
  Target
} from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'

const TIER_COLORS = {
  green: '#10B981',   // Emerald-500 - Reliable customers
  yellow: '#F59E0B',  // Amber-500 - Moderate risk
  red: '#EF4444'      // Red-500 - High risk
}

const CHANNEL_ICONS = {
  sms: MessageSquare,
  email: Mail,
  phone_call: Phone
}

/**
 * NotificationEffectivenessPanel Component
 * Displays analytics and management interface for risk-based notification system
 * Integrates with the new notification engine to show real-time effectiveness metrics
 */
export default function NotificationEffectivenessPanel({ barbershopId }) {
  const [effectivenessData, setEffectivenessData] = useState(null)
  const [upcomingNotifications, setUpcomingNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState(30)

  // Load effectiveness data
  const loadEffectivenessData = useCallback(async () => {
    if (!barbershopId) return
    
    setLoading(true)
    try {
      const [metricsResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/customer-behavior/notifications?barbershop_id=${barbershopId}&type=effectiveness_metrics`),
        fetch(`/api/customer-behavior/notifications?barbershop_id=${barbershopId}&type=upcoming_notifications`)
      ])
      
      if (!metricsResponse.ok || !upcomingResponse.ok) {
        throw new Error('Failed to load notification data')
      }
      
      const metricsData = await metricsResponse.json()
      const upcomingData = await upcomingResponse.json()
      
      setEffectivenessData(metricsData.metrics)
      setUpcomingNotifications(upcomingData.upcoming_notifications || [])
    } catch (err) {
      console.error('Error loading notification effectiveness:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  // Manual refresh with visual feedback
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadEffectivenessData()
    setRefreshing(false)
  }

  useEffect(() => {
    loadEffectivenessData()
  }, [loadEffectivenessData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bell className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading notification analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadEffectivenessData}
            className="ml-4"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!effectivenessData || effectivenessData.total_notifications === 0) {
    return (
      <Card>
        <CardHeader className="text-center">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <CardTitle>No Notification Data Yet</CardTitle>
          <CardDescription>
            Notification analytics will appear here once customers start booking with your risk-based communication system.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Notification Performance</h2>
            <p className="text-muted-foreground">
              Track the effectiveness of your risk-based communication system
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          title="Total Notifications"
          value={effectivenessData.total_notifications}
          icon={MessageSquare}
          description="Last 30 days"
        />
        
        <MetricCard
          title="Delivery Rate"
          value={effectivenessData.delivery_rate}
          icon={CheckCircle}
          description="Successfully delivered"
          trend={parseFloat(effectivenessData.delivery_rate) >= 95 ? 'positive' : 'neutral'}
        />
        
        <MetricCard
          title="Engagement Rate"
          value={effectivenessData.engagement_rate}
          icon={Target}
          description="Customer responses"
          trend={parseFloat(effectivenessData.engagement_rate) >= 30 ? 'positive' : 'neutral'}
        />
        
        <MetricCard
          title="Active Strategy"
          value="3-Tier System"
          icon={Users}
          description="Risk-based communication"
        />
      </div>

      {/* Effectiveness by Tier Analysis */}
      {effectivenessData.effectiveness_by_tier && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Risk Tier</CardTitle>
            <CardDescription>
              How your risk-based communication strategies are performing across customer segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {Object.entries(effectivenessData.effectiveness_by_tier).map(([tier, metrics]) => (
                <TierEffectivenessCard
                  key={tier}
                  tier={tier}
                  metrics={metrics}
                />
              ))}
            </div>
            
            {/* Tier Performance Chart */}
            <div className="h-64 mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatTierComparisonData(effectivenessData.effectiveness_by_tier)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tier" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivery_rate" fill="#8884d8" name="Delivery Rate %" />
                  <Bar dataKey="engagement_rate" fill="#82ca9d" name="Engagement Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Detailed Analysis */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming Notifications</TabsTrigger>
          <TabsTrigger value="strategies">Communication Strategies</TabsTrigger>
          <TabsTrigger value="insights">Performance Insights</TabsTrigger>
        </TabsList>

        {/* Upcoming Notifications */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Notifications</CardTitle>
              <CardDescription>
                Next {upcomingNotifications.length} notifications scheduled for your customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No upcoming notifications scheduled</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingNotifications.slice(0, 10).map((notification) => (
                    <UpcomingNotificationItem
                      key={notification.id}
                      notification={notification}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communication Strategies */}
        <TabsContent value="strategies">
          <Card>
            <CardHeader>
              <CardTitle>Risk-Based Communication Strategies</CardTitle>
              <CardDescription>
                Your intelligent notification system adapts communication based on customer behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <StrategyExplanation
                  tier="green"
                  title="Green Tier - Reliable Customers"
                  description="Minimal touch approach for customers with consistent attendance"
                  strategy="Single reminder 24 hours before appointment. Avoids over-communication."
                  effectiveness={effectivenessData.effectiveness_by_tier?.green}
                />
                
                <StrategyExplanation
                  tier="yellow"
                  title="Yellow Tier - Moderate Risk"
                  description="Enhanced confirmation system for customers with inconsistent patterns"
                  strategy="Booking confirmation + 48h reminder + 24h reminder with reschedule option + day-of confirmation."
                  effectiveness={effectivenessData.effectiveness_by_tier?.yellow}
                />
                
                <StrategyExplanation
                  tier="red"
                  title="Red Tier - High Risk"
                  description="White-glove concierge treatment for high-risk customers"
                  strategy="Personal confirmation call + detailed email + advance check-in + personal reminder + morning confirmation + pre-arrival text."
                  effectiveness={effectivenessData.effectiveness_by_tier?.red}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Insights */}
        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle>Performance Insights & Recommendations</CardTitle>
              <CardDescription>
                AI-powered insights to optimize your notification system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InsightsPanel effectivenessData={effectivenessData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper Components

function MetricCard({ title, value, icon: Icon, description, trend }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend === 'positive' && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === 'negative' && <TrendingDown className="h-3 w-3 text-red-500" />}
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function TierEffectivenessCard({ tier, metrics }) {
  const tierInfo = {
    green: { name: 'Reliable', description: 'Low-risk customers' },
    yellow: { name: 'Moderate Risk', description: 'Enhanced confirmations' },
    red: { name: 'High Risk', description: 'White-glove treatment' }
  }

  return (
    <Card className="border-l-4" style={{ borderLeftColor: TIER_COLORS[tier] }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm" style={{ color: TIER_COLORS[tier] }}>
          {tierInfo[tier]?.name}
        </CardTitle>
        <CardDescription className="text-xs">
          {tierInfo[tier]?.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Total Sent:</span>
          <span className="font-medium">{metrics.total}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Delivery:</span>
          <span className="font-medium">{metrics.delivery_rate}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Engagement:</span>
          <span className="font-medium">{metrics.engagement_rate}%</span>
        </div>
      </CardContent>
    </Card>
  )
}

function UpcomingNotificationItem({ notification }) {
  const ChannelIcon = CHANNEL_ICONS[notification.channel] || MessageSquare
  const timeUntil = new Date(notification.scheduled_time) - new Date()
  const hoursUntil = Math.max(0, Math.round(timeUntil / (1000 * 60 * 60)))

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <div 
          className="w-3 h-3 rounded-full" 
          style={{ backgroundColor: TIER_COLORS[notification.booking_notification_plans?.customer_risk_tier] }}
        />
        <div>
          <div className="font-medium">{notification.customers?.name || 'Unknown Customer'}</div>
          <div className="text-sm text-muted-foreground">
            {notification.type.replace(/_/g, ' ')} via {notification.channel}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-2 text-sm">
          <ChannelIcon className="h-4 w-4" />
          <Clock className="h-3 w-3" />
          <span>{hoursUntil}h</span>
        </div>
        <Badge variant="outline" className="text-xs mt-1">
          {notification.priority}
        </Badge>
      </div>
    </div>
  )
}

function StrategyExplanation({ tier, title, description, strategy, effectiveness }) {
  return (
    <div className="border rounded-lg p-4" style={{ borderLeftColor: TIER_COLORS[tier], borderLeftWidth: '4px' }}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold" style={{ color: TIER_COLORS[tier] }}>
            {title}
          </h4>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
          <p className="text-sm mt-2">{strategy}</p>
        </div>
        
        {effectiveness && (
          <div className="text-right ml-4">
            <div className="text-sm font-medium">
              {effectiveness.delivery_rate}% delivery
            </div>
            <div className="text-sm text-muted-foreground">
              {effectiveness.engagement_rate}% engagement
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function InsightsPanel({ effectivenessData }) {
  const insights = generateInsights(effectivenessData)
  
  return (
    <div className="space-y-4">
      {insights.map((insight, index) => (
        <Alert key={index} variant={insight.type === 'warning' ? 'destructive' : 'default'}>
          {insight.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <AlertDescription>
            <strong>{insight.title}</strong>
            <br />
            {insight.description}
            {insight.recommendation && (
              <>
                <br />
                <em>Recommendation: {insight.recommendation}</em>
              </>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

// Helper Functions

function formatTierComparisonData(tierData) {
  return Object.entries(tierData || {}).map(([tier, metrics]) => ({
    tier: tier.charAt(0).toUpperCase() + tier.slice(1),
    delivery_rate: parseFloat(metrics.delivery_rate) || 0,
    engagement_rate: parseFloat(metrics.engagement_rate) || 0
  }))
}

function generateInsights(data) {
  const insights = []
  
  const overallDeliveryRate = parseFloat(data.delivery_rate) || 0
  const overallEngagementRate = parseFloat(data.engagement_rate) || 0
  
  // Delivery rate insights
  if (overallDeliveryRate >= 95) {
    insights.push({
      type: 'success',
      title: 'Excellent Delivery Performance',
      description: `Your ${data.delivery_rate} delivery rate exceeds industry standards. Your notification system is working reliably.`
    })
  } else if (overallDeliveryRate < 85) {
    insights.push({
      type: 'warning',
      title: 'Delivery Rate Needs Attention',
      description: `Your ${data.delivery_rate} delivery rate is below optimal. This could indicate issues with contact information quality or notification service reliability.`,
      recommendation: 'Review failed notification logs and consider verifying customer contact information at booking.'
    })
  }
  
  // Engagement insights
  if (overallEngagementRate >= 40) {
    insights.push({
      type: 'success',
      title: 'High Customer Engagement',
      description: `Your ${data.engagement_rate} engagement rate shows customers are actively responding to your communications.`
    })
  } else if (overallEngagementRate < 20) {
    insights.push({
      type: 'warning',
      title: 'Low Customer Engagement',
      description: `Your ${data.engagement_rate} engagement rate suggests customers aren't responding to notifications as expected.`,
      recommendation: 'Consider personalizing messages more or adjusting notification timing based on customer preferences.'
    })
  }
  
  // Tier-specific insights
  if (data.effectiveness_by_tier) {
    const { green, yellow, red } = data.effectiveness_by_tier
    
    if (red && parseFloat(red.engagement_rate) > parseFloat(yellow?.engagement_rate || 0)) {
      insights.push({
        type: 'success',
        title: 'High-Risk Strategy Working',
        description: 'Your white-glove approach for high-risk customers is generating better engagement than moderate-risk communications.',
        recommendation: 'Consider whether some yellow-tier customers might benefit from red-tier treatment.'
      })
    }
    
    if (green && parseFloat(green.engagement_rate) < 50) {
      insights.push({
        type: 'info',
        title: 'Reliable Customer Opportunity',
        description: 'Your reliable customers have room for improved engagement.',
        recommendation: 'Consider adding value-added content to green-tier notifications (service tips, loyalty rewards, etc.)'
      })
    }
  }
  
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      title: 'System Running Normally',
      description: 'Your notification system is performing within expected ranges. Continue monitoring for optimization opportunities.'
    })
  }
  
  return insights
}