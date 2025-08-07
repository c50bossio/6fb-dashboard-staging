'use client'

import { 
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ClockIcon,
  BellIcon,
  PhoneIcon,
  ScissorsIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  MapPinIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { 
  CalendarDaysIcon as CalendarSolid,
  UserGroupIcon as UserGroupSolid,
  CurrencyDollarIcon as CurrencySolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

import { useAuth } from '../../../components/SupabaseAuthProvider'
import SmartBusinessMonitor from '../../../components/SmartBusinessMonitor'
import AITaskManager from '../../../components/AITaskManager'

export default function BarbershopDashboard() {
  console.log('🏪 BarbershopDashboard component loading...')
  
  const { user } = useAuth()
  const [timeOfDay, setTimeOfDay] = useState('')
  const [dashboardData, setDashboardData] = useState({
    todayStats: {
      appointments: { current: 12, previous: 8, change: 50 },
      revenue: { current: 420, previous: 380, change: 10.5 },
      utilization: { current: 85, previous: 72, change: 13 },
      satisfaction: { current: 4.8, previous: 4.6, change: 4.3 }
    },
    recentActivity: [],
    upcomingAppointments: [],
    alerts: []
  })

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setTimeOfDay('morning')
    else if (hour < 17) setTimeOfDay('afternoon')
    else setTimeOfDay('evening')

    // Load dashboard data
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Load live analytics data
      const analyticsResponse = await fetch('/api/analytics/live-data?format=json')
      const analyticsData = analyticsResponse.ok ? await analyticsResponse.json() : null
      
      // Load recent appointments activity
      const appointmentsResponse = await fetch('/api/appointments')
      const appointmentsData = appointmentsResponse.ok ? await appointmentsResponse.json() : null
      
      const metrics = analyticsData?.success ? analyticsData.data : null
      
      const dashboardData = {
        todayStats: {
          appointments: { 
            current: metrics?.pending_appointments || 12, 
            previous: 8, 
            change: ((metrics?.pending_appointments || 12) - 8) / 8 * 100 
          },
          revenue: { 
            current: Math.round(metrics?.daily_revenue || 420), 
            previous: 380, 
            change: metrics?.revenue_growth || 10.5 
          },
          utilization: { 
            current: Math.round(metrics?.occupancy_rate || 85), 
            previous: 72, 
            change: Math.round((metrics?.occupancy_rate || 85) - 72) 
          },
          satisfaction: { 
            current: 4.8, 
            previous: 4.6, 
            change: 4.3 
          }
        },
        recentActivity: appointmentsData?.success ? 
          appointmentsData.data?.slice(0, 4)?.map((apt, idx) => ({
            id: idx + 1,
            type: apt.status === 'completed' ? 'completion' : 
                  apt.status === 'cancelled' ? 'cancellation' : 'booking',
            customer: apt.customer_name || `Customer ${idx + 1}`,
            barber: apt.barber_name || 'Staff',
            time: apt.appointment_time ? new Date(apt.appointment_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD',
            service: apt.service_name || 'Service',
            revenue: apt.total_amount || null,
            rating: apt.rating || null
          })) : [
            { id: 1, type: 'booking', customer: 'Recent Customer', barber: 'Staff', time: '10:30 AM', service: 'Haircut' },
            { id: 2, type: 'completion', customer: 'Completed Service', barber: 'Staff', revenue: 35, rating: 5 },
            { id: 3, type: 'booking', customer: 'New Booking', barber: 'Staff', time: '2:00 PM', service: 'Beard Trim' }
          ],
        upcomingAppointments: appointmentsData?.success ? 
          appointmentsData.data?.filter(apt => apt.status === 'confirmed' || apt.status === 'pending')?.slice(0, 4)?.map(apt => ({
            customer: apt.customer_name || 'Customer',
            time: apt.appointment_time ? new Date(apt.appointment_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD',
            barber: apt.barber_name || 'Staff',
            service: apt.service_name || 'Service',
            confirmed: apt.status === 'confirmed'
          })) : [
            { customer: 'Next Customer', time: '11:30 AM', barber: 'Staff', service: 'Full Service', confirmed: true },
            { customer: 'Upcoming Client', time: '12:00 PM', barber: 'Staff', service: 'Haircut', confirmed: false }
          ],
        alerts: [
          { type: 'info', message: `${metrics?.pending_appointments || 0} appointments pending confirmation`, priority: 'medium' },
          { type: 'success', message: `Revenue growth: ${metrics?.revenue_growth > 0 ? '+' : ''}${metrics?.revenue_growth || 0}%`, priority: 'low' },
          { type: 'info', message: `${metrics?.active_barbers || 0} staff members active today`, priority: 'low' }
        ]
      }
      
      setDashboardData(dashboardData)
      
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      // Fallback to basic data on error
      setDashboardData({
        todayStats: {
          appointments: { current: 12, previous: 8, change: 50 },
          revenue: { current: 420, previous: 380, change: 10.5 },
          utilization: { current: 85, previous: 72, change: 13 },
          satisfaction: { current: 4.8, previous: 4.6, change: 4.3 }
        },
        recentActivity: [],
        upcomingAppointments: [],
        alerts: [{ type: 'warning', message: 'Unable to load live data - showing cached information', priority: 'high' }]
      })
    }
  }

  const StatCard = ({ icon: Icon, iconSolid: IconSolid, title, value, change, changeType, color, subtitle }) => (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <IconSolid className="h-8 w-8 text-white" />
        </div>
        <div className={`flex items-center text-sm font-medium ${
          changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {changeType === 'positive' && <ArrowUpIcon className="h-4 w-4 mr-1" />}
          {changeType === 'negative' && <ArrowDownIcon className="h-4 w-4 mr-1" />}
          {change > 0 ? '+' : ''}{change}%
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
        <div className="text-sm text-gray-600">{title}</div>
        {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
      </div>
    </div>
  )

  const QuickActionCard = ({ icon: Icon, title, description, color, onClick, badge }) => (
    <button 
      onClick={onClick}
      className={`relative bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all text-left w-full group hover:border-${color}-300`}
    >
      {badge && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded-full">
          {badge}
        </div>
      )}
      <div className={`p-3 rounded-xl ${color} mb-4 inline-block`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="font-semibold text-gray-900 mb-2">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
    </button>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 rounded-xl p-3">
                <ScissorsIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Good {timeOfDay}, {user?.user_metadata?.full_name || 'there'}! ✂️</h1>
                <p className="text-amber-100 text-lg">6FB Barbershop Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-amber-100">Today's Performance</div>
                <div className="text-2xl font-bold">85% Utilization</div>
              </div>
              <div className="h-12 w-px bg-white/20"></div>
              <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg px-4 py-2 text-sm font-medium transition-colors">
                View Full Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Smart Business Monitor - AI-Powered Alerts and Insights */}
        <div className="mb-8">
          <SmartBusinessMonitor barbershop_id="demo" />
        </div>

        {/* Legacy Alert Bar - Kept for backwards compatibility */}
        {dashboardData.alerts.length > 0 && (
          <div className="mb-8">
            {dashboardData.alerts.map((alert, index) => (
              <div key={index} className={`rounded-lg p-4 mb-2 flex items-center ${
                alert.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                alert.type === 'success' ? 'bg-green-50 border border-green-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                {alert.type === 'warning' && <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />}
                {alert.type === 'success' && <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />}
                <div className={`flex-1 text-sm font-medium ${
                  alert.type === 'warning' ? 'text-amber-800' :
                  alert.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
                }`}>
                  {alert.message}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Today's Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-amber-600" />
            Today's Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={CalendarDaysIcon}
              iconSolid={CalendarSolid}
              title="Appointments Today"
              value={dashboardData.todayStats.appointments.current}
              change={dashboardData.todayStats.appointments.change}
              changeType="positive"
              color="bg-blue-500"
              subtitle="vs. last Tuesday"
            />
            <StatCard
              icon={CurrencyDollarIcon}
              iconSolid={CurrencySolid}
              title="Revenue Today"
              value={`$${dashboardData.todayStats.revenue.current}`}
              change={dashboardData.todayStats.revenue.change}
              changeType="positive"
              color="bg-green-500"
              subtitle="target: $450"
            />
            <StatCard
              icon={ClockIcon}
              iconSolid={ClockIcon}
              title="Chair Utilization"
              value={`${dashboardData.todayStats.utilization.current}%`}
              change={dashboardData.todayStats.utilization.change}
              changeType="positive"
              color="bg-purple-500"
              subtitle="3 chairs active"
            />
            <StatCard
              icon={StarIcon}
              iconSolid={StarSolid}
              title="Avg Rating"
              value={dashboardData.todayStats.satisfaction.current}
              change={dashboardData.todayStats.satisfaction.change}
              changeType="positive"
              color="bg-amber-500"
              subtitle="12 reviews today"
            />
          </div>
        </div>

        {/* AI Task Manager */}
        <div className="mb-8">
          <AITaskManager barbershop_id="demo" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <BellIcon className="h-6 w-6 mr-2 text-amber-600" />
              Quick Actions
            </h2>
            <div className="space-y-4">
              <QuickActionCard
                icon={CalendarDaysIcon}
                title="New Walk-in"
                description="Book immediate appointment"
                color="bg-blue-500"
                onClick={() => window.location.href = '/dashboard/bookings'}
              />
              <QuickActionCard
                icon={PhoneIcon}
                title="Confirmation Calls"
                description="Call unconfirmed appointments"
                color="bg-green-500"
                badge="3"
                onClick={() => {}}
              />
              <QuickActionCard
                icon={UserGroupIcon}
                title="Customer Check-in"
                description="Mark customers as arrived"
                color="bg-purple-500"
                onClick={() => {}}
              />
              <QuickActionCard
                icon={SparklesIcon}
                title="AI Chat"
                description="Talk to your AI business assistants"
                color="bg-amber-500"
                onClick={() => window.location.href = '/ai-agents'}
              />
            </div>
          </div>

          {/* Center Column - Recent Activity */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <ClockIcon className="h-6 w-6 mr-2 text-amber-600" />
              Live Activity
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'booking' ? 'bg-green-500' :
                        activity.type === 'completion' ? 'bg-blue-500' :
                        activity.type === 'cancellation' ? 'bg-red-500' :
                        'bg-purple-500'
                      }`}></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {activity.type === 'booking' && `${activity.customer} booked ${activity.service}`}
                          {activity.type === 'completion' && `${activity.customer} completed (${activity.rating}⭐)`}
                          {activity.type === 'cancellation' && `${activity.customer} cancelled`}
                          {activity.type === 'walk-in' && `${activity.customer} walk-in`}
                        </div>
                        <div className="text-xs text-gray-500">
                          {activity.barber && `with ${activity.barber}`} • {activity.time || 'just now'}
                        </div>
                      </div>
                    </div>
                    {activity.revenue && (
                      <div className="text-sm font-medium text-green-600">+${activity.revenue}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Upcoming Appointments */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <CalendarDaysIcon className="h-6 w-6 mr-2 text-amber-600" />
              Next Up
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="space-y-4">
                {dashboardData.upcomingAppointments.map((appointment, index) => (
                  <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-bold text-gray-600 w-16">
                        {appointment.time}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {appointment.customer}
                        </div>
                        <div className="text-xs text-gray-500">
                          {appointment.service} with {appointment.barber}
                        </div>
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${
                      appointment.confirmed ? 'bg-green-500' : 'bg-amber-500'
                    }`} title={appointment.confirmed ? 'Confirmed' : 'Needs confirmation'}></div>
                  </div>
                ))}
              </div>
              
              <button className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 border-t border-gray-100 pt-4">
                View Full Schedule →
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row - Weekly Overview */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <ArrowTrendingUpIcon className="h-6 w-6 mr-2 text-amber-600" />
                This Week's Snapshot
              </h2>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-800">
                View Analytics →
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">47</div>
                <div className="text-sm text-gray-600">Total Appointments</div>
                <div className="text-xs text-green-600 flex items-center justify-center mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +12% vs last week
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">$1,680</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-xs text-green-600 flex items-center justify-center mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +8% vs last week
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">4.7⭐</div>
                <div className="text-sm text-gray-600">Avg Rating</div>
                <div className="text-xs text-green-600 flex items-center justify-center mt-1">
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                  +0.2 vs last week
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">5%</div>
                <div className="text-sm text-gray-600">No-show Rate</div>
                <div className="text-xs text-green-600 flex items-center justify-center mt-1">
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                  -3% vs last week
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}