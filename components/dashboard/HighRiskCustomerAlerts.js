'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { 
  AlertTriangle, 
  Phone, 
  Mail, 
  Clock, 
  Calendar,
  User,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  UserX
} from 'lucide-react'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import { useRiskBasedNotifications } from '@/hooks/useRiskBasedNotifications'

const RISK_TIER_CONFIG = {
  red: {
    name: 'High Risk',
    color: 'bg-red-100 border-red-200 text-red-800',
    icon: AlertTriangle,
    iconColor: 'text-red-600',
    priority: 'urgent'
  },
  yellow: {
    name: 'Moderate Risk',
    color: 'bg-yellow-100 border-yellow-200 text-yellow-800', 
    icon: Shield,
    iconColor: 'text-yellow-600',
    priority: 'medium'
  },
  green: {
    name: 'Low Risk',
    color: 'bg-green-100 border-green-200 text-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-600',
    priority: 'low'
  }
}

/**
 * HighRiskCustomerAlerts Component
 * Provides real-time monitoring and alert system for high-risk customers
 * Integrates with the risk-based notification system to prevent no-shows
 */
export default function HighRiskCustomerAlerts({ barbershopId }) {
  const [alerts, setAlerts] = useState([])
  const [upcomingHighRisk, setUpcomingHighRisk] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('today')

  const { getCommunicationHistory, getRiskTierInfo } = useRiskBasedNotifications()

  // Load high-risk customer alerts
  const loadHighRiskAlerts = useCallback(async () => {
    if (!barbershopId) return
    
    setLoading(true)
    try {
      // Get high-risk customers and upcoming notifications
      const [highRiskResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/customer-behavior/manage?barbershop_id=${barbershopId}&type=high_risk_customers`),
        fetch(`/api/customer-behavior/notifications?barbershop_id=${barbershopId}&type=upcoming_notifications`)
      ])
      
      if (!highRiskResponse.ok || !upcomingResponse.ok) {
        throw new Error('Failed to load high-risk customer data')
      }
      
      const highRiskData = await highRiskResponse.json()
      const upcomingData = await upcomingResponse.json()
      
      // Process and filter the data
      const processedAlerts = await processAlerts(highRiskData.high_risk_customers || [])
      const filteredUpcoming = filterUpcomingByRisk(upcomingData.upcoming_notifications || [])
      
      setAlerts(processedAlerts)
      setUpcomingHighRisk(filteredUpcoming)
      setSummary(generateSummary(processedAlerts, filteredUpcoming))
      
    } catch (err) {
      console.error('Error loading high-risk alerts:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [barbershopId])

  // Process alerts with additional context
  const processAlerts = async (customers) => {
    const processedAlerts = []
    
    for (const customer of customers) {
      try {
        // Get upcoming appointments for this customer
        const appointmentResponse = await fetch(`/api/appointments?customer_id=${customer.customer_id}&barbershop_id=${barbershopId}&upcoming=true`)
        const appointments = appointmentResponse.ok ? (await appointmentResponse.json()).data || [] : []
        
        // Calculate urgency based on next appointment
        const nextAppointment = appointments[0]
        const urgency = calculateUrgency(nextAppointment, customer.risk_score)
        
        processedAlerts.push({
          ...customer,
          next_appointment: nextAppointment,
          urgency,
          alert_type: determineAlertType(customer, nextAppointment),
          last_contact: await getLastContactTime(customer.customer_id, barbershopId)
        })
      } catch (error) {
        console.error(`Error processing customer ${customer.customer_id}:`, error)
        // Include customer even if additional data fails
        processedAlerts.push({
          ...customer,
          urgency: 'medium',
          alert_type: 'risk_monitoring'
        })
      }
    }
    
    // Sort by urgency and risk score
    return processedAlerts.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      const urgencyDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      if (urgencyDiff !== 0) return urgencyDiff
      return b.risk_score - a.risk_score
    })
  }

  // Filter upcoming notifications for high-risk customers
  const filterUpcomingByRisk = (notifications) => {
    return notifications.filter(notification => 
      notification.booking_notification_plans?.customer_risk_tier === 'red' ||
      notification.priority === 'urgent'
    ).slice(0, 10) // Limit to top 10 most urgent
  }

  // Generate summary statistics
  const generateSummary = (alerts, upcoming) => {
    const criticalAlerts = alerts.filter(alert => alert.urgency === 'critical').length
    const todayAppointments = alerts.filter(alert => 
      alert.next_appointment && isToday(new Date(alert.next_appointment.start_time))
    ).length
    
    return {
      total_alerts: alerts.length,
      critical_alerts: criticalAlerts,
      today_appointments: todayAppointments,
      pending_notifications: upcoming.length,
      risk_prevention_active: alerts.length > 0 || upcoming.length > 0
    }
  }

  // Calculate urgency level
  const calculateUrgency = (appointment, riskScore) => {
    if (!appointment) return 'medium'
    
    const appointmentTime = new Date(appointment.start_time)
    const hoursUntil = (appointmentTime - new Date()) / (1000 * 60 * 60)
    
    if (riskScore >= 80 && hoursUntil <= 2) return 'critical'
    if (riskScore >= 70 && hoursUntil <= 24) return 'high'
    if (riskScore >= 60 && hoursUntil <= 48) return 'medium'
    return 'low'
  }

  // Determine alert type
  const determineAlertType = (customer, appointment) => {
    if (!appointment) return 'risk_monitoring'
    
    const hoursUntil = (new Date(appointment.start_time) - new Date()) / (1000 * 60 * 60)
    
    if (customer.risk_score >= 80) return 'no_show_likely'
    if (hoursUntil <= 24 && customer.risk_score >= 60) return 'confirmation_needed' 
    if (customer.previous_no_shows_score >= 80) return 'repeat_no_show_risk'
    return 'risk_monitoring'
  }

  // Get last contact time (simplified - would integrate with notification history)
  const getLastContactTime = async (customerId, barbershopId) => {
    try {
      const history = await getCommunicationHistory(customerId, barbershopId)
      const lastContact = history.communication_history?.[0]
      return lastContact?.scheduled_time || null
    } catch (error) {
      return null
    }
  }

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadHighRiskAlerts()
    setRefreshing(false)
  }

  useEffect(() => {
    loadHighRiskAlerts()
  }, [loadHighRiskAlerts])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 animate-pulse mx-auto mb-4 text-orange-500" />
          <p className="text-muted-foreground">Loading risk alerts...</p>
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
          <Button variant="outline" size="sm" onClick={loadHighRiskAlerts} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!summary?.risk_prevention_active) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
          <CardTitle>No High-Risk Alerts</CardTitle>
          <CardDescription>
            All your customers are currently in low-to-moderate risk categories. 
            Your risk prevention system is monitoring for any changes.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Alert Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div>
            <h2 className="text-2xl font-bold">High-Risk Customer Alerts</h2>
            <p className="text-muted-foreground">
              Proactive monitoring to prevent no-shows and improve customer retention
            </p>
          </div>
        </div>
        
        <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AlertSummaryCard
          title="Critical Alerts"
          value={summary.critical_alerts}
          icon={AlertTriangle}
          iconColor="text-red-500"
          description="Require immediate attention"
        />
        
        <AlertSummaryCard
          title="Today's High-Risk"
          value={summary.today_appointments}
          icon={Calendar}
          iconColor="text-orange-500"
          description="High-risk appointments today"
        />
        
        <AlertSummaryCard
          title="Total Monitoring"
          value={summary.total_alerts}
          icon={Eye}
          iconColor="text-blue-500"
          description="Customers being monitored"
        />
        
        <AlertSummaryCard
          title="Active Notifications"
          value={summary.pending_notifications}
          icon={Bell}
          iconColor="text-purple-500"
          description="Scheduled for high-risk customers"
        />
      </div>

      {/* Critical Alerts Section */}
      {summary.critical_alerts > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Alert:</strong> {summary.critical_alerts} high-risk customer(s) with appointments in the next 2 hours require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      {/* High-Risk Customer List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            High-Risk Customer Monitoring
          </CardTitle>
          <CardDescription>
            Customers identified as likely to miss appointments without intervention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 10).map((alert) => (
              <HighRiskCustomerItem
                key={alert.customer_id}
                alert={alert}
                onViewDetails={() => handleViewCustomerDetails(alert.customer_id)}
                onContactCustomer={() => handleContactCustomer(alert)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming High-Priority Notifications */}
      {upcomingHighRisk.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Upcoming High-Priority Notifications
            </CardTitle>
            <CardDescription>
              Scheduled communications for high-risk customers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingHighRisk.map((notification) => (
                <UpcomingNotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper Components

function AlertSummaryCard({ title, value, icon: Icon, iconColor, description }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

function HighRiskCustomerItem({ alert, onViewDetails, onContactCustomer }) {
  const riskConfig = RISK_TIER_CONFIG[alert.risk_tier] || RISK_TIER_CONFIG.red
  const RiskIcon = riskConfig.icon
  
  const getAlertMessage = () => {
    switch (alert.alert_type) {
      case 'no_show_likely':
        return 'Very likely to miss appointment - immediate contact recommended'
      case 'confirmation_needed':
        return 'Appointment confirmation needed within 24 hours'
      case 'repeat_no_show_risk':
        return 'History of no-shows - requires special attention'
      default:
        return 'Customer being monitored for no-show risk'
    }
  }

  const getUrgencyBadge = () => {
    const config = {
      critical: { variant: 'destructive', text: 'Critical' },
      high: { variant: 'secondary', text: 'High Priority' },
      medium: { variant: 'outline', text: 'Medium' },
      low: { variant: 'outline', text: 'Monitor' }
    }
    return config[alert.urgency] || config.medium
  }

  return (
    <div className={`p-4 border rounded-lg ${riskConfig.color}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarFallback>
              <AvatarInitials name={alert.customers?.name || 'Unknown'} />
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold truncate">
                {alert.customers?.name || 'Unknown Customer'}
              </h4>
              <RiskIcon className={`h-4 w-4 ${riskConfig.iconColor}`} />
              <Badge {...getUrgencyBadge()}>
                {getUrgencyBadge().text}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              Risk Score: {alert.risk_score}/100 | {getAlertMessage()}
            </p>
            
            {alert.next_appointment && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(alert.next_appointment.start_time), 'MMM dd, HH:mm')}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(alert.next_appointment.start_time), { addSuffix: true })}
                </span>
              </div>
            )}
            
            {alert.last_contact && (
              <p className="text-xs text-muted-foreground mt-1">
                Last contact: {formatDistanceToNow(new Date(alert.last_contact), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={onContactCustomer}
            className={alert.urgency === 'critical' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            <Phone className="h-4 w-4 mr-1" />
            Contact
          </Button>
        </div>
      </div>
    </div>
  )
}

function UpcomingNotificationItem({ notification }) {
  const timeUntil = new Date(notification.scheduled_time) - new Date()
  const hoursUntil = Math.max(0, Math.round(timeUntil / (1000 * 60 * 60)))
  
  const getChannelIcon = () => {
    switch (notification.channel) {
      case 'phone_call': return Phone
      case 'email': return Mail
      default: return Bell
    }
  }
  
  const ChannelIcon = getChannelIcon()
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <ChannelIcon className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="font-medium">
            {notification.customers?.name || 'Customer'}
          </p>
          <p className="text-sm text-muted-foreground">
            {notification.type.replace(/_/g, ' ')} via {notification.channel}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <Badge variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}>
          {notification.priority}
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          in {hoursUntil}h
        </p>
      </div>
    </div>
  )
}

// Event Handlers (would be implemented based on specific needs)
function handleViewCustomerDetails(customerId) {
  console.log('View customer details:', customerId)
  // Would navigate to customer detail view or open modal
}

function handleContactCustomer(alert) {
  console.log('Contact customer:', alert)
  // Would open contact modal or initiate call/message
}