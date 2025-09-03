'use client'

import {
  BanknotesIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  GiftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  UserIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import { getTenant } from '@/lib/tenant-resolver-client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card'
import Button from '../ui/Button'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

// Utility function to format currency
const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '$0.00'
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  return numAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  })
}

// Utility function to format percentage
const formatPercentage = (value) => {
  if (value === null || value === undefined) return '0%'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  return `${numValue.toFixed(1)}%`
}

// Utility function to get period comparison
const getPeriodComparison = (current, previous) => {
  if (!previous || previous === 0) return { change: 0, trend: 'neutral' }
  const change = ((current - previous) / previous) * 100
  const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  return { change: Math.abs(change), trend }
}

export default function BarberEarningsDashboard({ financeContext, onRefresh }) {
  console.log('👨‍💼 BARBER EARNINGS DASHBOARD: Rendering for barber view')
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [earningsData, setEarningsData] = useState(null)
  const [timeRange, setTimeRange] = useState('week')
  const [error, setError] = useState(null)
  const [payoutPreferences, setPayoutPreferences] = useState(null)

  useEffect(() => {
    if (financeContext && profile) {
      loadEarningsData()
    }
  }, [financeContext, profile, timeRange])

  const loadEarningsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { barbershopId } = financeContext
      
      // Get date ranges for different periods
      const now = new Date()
      const ranges = {
        day: {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        },
        week: {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          end: now
        },
        month: {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: now
        }
      }

      const currentRange = ranges[timeRange]
      const previousRange = {
        start: new Date(currentRange.start.getTime() - (currentRange.end.getTime() - currentRange.start.getTime())),
        end: currentRange.start
      }

      // Fetch appointments for the barber (completed ones only)
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          id,
          date,
          time,
          service_price,
          tip_amount,
          status,
          service_name,
          customer_name,
          payment_status,
          created_at,
          commission_rate,
          commission_amount
        `)
        .eq('barber_id', profile.id)
        .eq('barbershop_id', barbershopId)
        .in('status', ['completed', 'paid'])
        .gte('date', currentRange.start.toISOString().split('T')[0])
        .lte('date', currentRange.end.toISOString().split('T')[0])
        .order('date', { ascending: false })

      if (appointmentsError) throw appointmentsError

      // Fetch previous period for comparison
      const { data: previousAppointments } = await supabase
        .from('appointments')
        .select('service_price, tip_amount, commission_amount')
        .eq('barber_id', profile.id)
        .eq('barbershop_id', barbershopId)
        .in('status', ['completed', 'paid'])
        .gte('date', previousRange.start.toISOString().split('T')[0])
        .lte('date', previousRange.end.toISOString().split('T')[0])

      // Fetch barber's commission settings
      const { data: barberSettings } = await supabase
        .from('barber_financial_settings')
        .select('commission_rate, booth_rent, payout_schedule, bank_details')
        .eq('barber_id', profile.id)
        .eq('barbershop_id', barbershopId)
        .single()

      // Calculate current period metrics
      const currentEarnings = appointments?.reduce((acc, apt) => ({
        totalRevenue: acc.totalRevenue + (apt.service_price || 0),
        totalTips: acc.totalTips + (apt.tip_amount || 0),
        totalCommission: acc.totalCommission + (apt.commission_amount || (apt.service_price * (apt.commission_rate || 0.5))),
        totalAppointments: acc.totalAppointments + 1
      }), { totalRevenue: 0, totalTips: 0, totalCommission: 0, totalAppointments: 0 }) || 
      { totalRevenue: 0, totalTips: 0, totalCommission: 0, totalAppointments: 0 }

      // Calculate previous period metrics
      const previousEarnings = previousAppointments?.reduce((acc, apt) => ({
        totalRevenue: acc.totalRevenue + (apt.service_price || 0),
        totalTips: acc.totalTips + (apt.tip_amount || 0),
        totalCommission: acc.totalCommission + (apt.commission_amount || (apt.service_price * 0.5))
      }), { totalRevenue: 0, totalTips: 0, totalCommission: 0 }) || 
      { totalRevenue: 0, totalTips: 0, totalCommission: 0 }

      // Calculate total earnings (commission + tips)
      const currentTotalEarnings = currentEarnings.totalCommission + currentEarnings.totalTips
      const previousTotalEarnings = previousEarnings.totalCommission + previousEarnings.totalTips

      // Generate chart data for the last 7 days
      const chartData = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        
        const dayAppointments = appointments?.filter(apt => apt.date === dateStr) || []
        const dayEarnings = dayAppointments.reduce((sum, apt) => 
          sum + (apt.commission_amount || (apt.service_price * (apt.commission_rate || 0.5))) + (apt.tip_amount || 0), 0)
        const dayAppointmentCount = dayAppointments.length

        chartData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          earnings: dayEarnings,
          appointments: dayAppointmentCount
        })
      }

      // Calculate upcoming payout
      const nextPayoutDate = getNextPayoutDate(barberSettings?.payout_schedule || 'weekly')
      const pendingEarnings = currentTotalEarnings // In reality, this would be more complex

      setEarningsData({
        current: {
          ...currentEarnings,
          totalEarnings: currentTotalEarnings,
          averagePerService: currentEarnings.totalAppointments > 0 ? 
            currentTotalEarnings / currentEarnings.totalAppointments : 0
        },
        previous: {
          ...previousEarnings,
          totalEarnings: previousTotalEarnings
        },
        chartData,
        recentAppointments: appointments?.slice(0, 5) || [],
        settings: barberSettings,
        nextPayout: {
          date: nextPayoutDate,
          amount: pendingEarnings
        },
        comparisons: {
          earnings: getPeriodComparison(currentTotalEarnings, previousTotalEarnings),
          appointments: getPeriodComparison(currentEarnings.totalAppointments, previousEarnings.totalAppointments || 0),
          tips: getPeriodComparison(currentEarnings.totalTips, previousEarnings.totalTips)
        }
      })

      setPayoutPreferences(barberSettings)

    } catch (error) {
      console.error('Error loading earnings data:', error)
      setError('Failed to load earnings data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getNextPayoutDate = (schedule) => {
    const now = new Date()
    switch (schedule) {
      case 'weekly':
        const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
        return new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000)
      case 'biweekly':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1)
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    }
  }

  const handlePayoutRequest = async () => {
    // This would integrate with the payout system
    console.log('Requesting early payout...')
  }

  const handleUpdatePreferences = () => {
    // Navigate to payout preferences
    console.log('Opening payout preferences...')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                <div>
                  <h3 className="font-medium text-red-800">Unable to Load Earnings</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  <Button 
                    onClick={loadEarningsData}
                    className="mt-3 bg-red-600 hover:bg-red-700 text-white"
                    size="sm"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { current, previous, chartData, recentAppointments, nextPayout, comparisons } = earningsData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Earnings</h1>
            <p className="text-gray-600 mt-1">Track your commissions, tips, and upcoming payouts</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button onClick={onRefresh} variant="outline">
              Refresh
            </Button>
          </div>
        </div>

        {/* Earnings Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Earnings */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(current.totalEarnings)}
                  </p>
                  {comparisons.earnings.trend !== 'neutral' && (
                    <div className={`flex items-center mt-1 text-sm ${
                      comparisons.earnings.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparisons.earnings.trend === 'up' ? 
                        <ArrowUpIcon className="h-4 w-4 mr-1" /> : 
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      }
                      {formatPercentage(comparisons.earnings.change)} vs last {timeRange}
                    </div>
                  )}
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commission */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Commission</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(current.totalCommission)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    From {formatCurrency(current.totalRevenue)} services
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChartBarIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tips</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(current.totalTips)}
                  </p>
                  {comparisons.tips.trend !== 'neutral' && (
                    <div className={`flex items-center mt-1 text-sm ${
                      comparisons.tips.trend === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparisons.tips.trend === 'up' ? 
                        <ArrowUpIcon className="h-4 w-4 mr-1" /> : 
                        <ArrowDownIcon className="h-4 w-4 mr-1" />
                      }
                      {formatPercentage(comparisons.tips.change)} vs last {timeRange}
                    </div>
                  )}
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <GiftIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {current.totalAppointments}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Avg: {formatCurrency(current.averagePerService)}/service
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Earnings Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowUpIcon className="h-5 w-5 mr-2" />
                Daily Earnings
              </CardTitle>
              <CardDescription>
                Your earnings and appointment count over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="earnings" orientation="left" />
                    <YAxis yAxisId="appointments" orientation="right" />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'earnings' ? formatCurrency(value) : value,
                        name === 'earnings' ? 'Earnings' : 'Appointments'
                      ]}
                    />
                    <Bar yAxisId="earnings" dataKey="earnings" fill="#10b981" name="earnings" />
                    <Line yAxisId="appointments" type="monotone" dataKey="appointments" stroke="#6366f1" strokeWidth={2} name="appointments" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Next Payout */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Next Payout
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {formatCurrency(nextPayout.amount)}
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    Expected: {nextPayout.date.toLocaleDateString('en-US', { 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  {payoutPreferences?.bank_details && (
                    <div className="flex items-center justify-center text-sm text-green-600 mb-4">
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Bank account connected
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="space-y-2">
                <Button 
                  onClick={handlePayoutRequest}
                  className="w-full"
                  disabled={nextPayout.amount < 50}
                >
                  Request Early Payout
                </Button>
                <Button 
                  onClick={handleUpdatePreferences}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Payout Settings
                </Button>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">View Schedule</div>
                      <div className="text-sm text-gray-500">See upcoming appointments</div>
                    </div>
                  </div>
                </button>
                
                <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">Detailed Analytics</div>
                      <div className="text-sm text-gray-500">View comprehensive reports</div>
                    </div>
                  </div>
                </button>

                <button className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="font-medium">Payment History</div>
                      <div className="text-sm text-gray-500">View past payouts</div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Appointments */}
        {recentAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Appointments</CardTitle>
              <CardDescription>Your latest completed services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-gray-500">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Customer</th>
                      <th className="text-left py-2">Service</th>
                      <th className="text-right py-2">Service Price</th>
                      <th className="text-right py-2">Commission</th>
                      <th className="text-right py-2">Tips</th>
                      <th className="text-right py-2">Total Earned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAppointments.map((appointment) => (
                      <tr key={appointment.id} className="border-b">
                        <td className="py-3 text-sm">
                          {new Date(appointment.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-sm font-medium">
                          {appointment.customer_name || 'Walk-in'}
                        </td>
                        <td className="py-3 text-sm">
                          {appointment.service_name}
                        </td>
                        <td className="py-3 text-sm text-right">
                          {formatCurrency(appointment.service_price)}
                        </td>
                        <td className="py-3 text-sm text-right">
                          {formatCurrency(appointment.commission_amount || 
                            (appointment.service_price * (appointment.commission_rate || 0.5)))}
                        </td>
                        <td className="py-3 text-sm text-right">
                          {formatCurrency(appointment.tip_amount || 0)}
                        </td>
                        <td className="py-3 text-sm text-right font-medium">
                          {formatCurrency(
                            (appointment.commission_amount || 
                             (appointment.service_price * (appointment.commission_rate || 0.5))) +
                            (appointment.tip_amount || 0)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Banner */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start space-x-3">
              <InformationCircleIcon className="h-6 w-6 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-blue-800">About Your Earnings</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Earnings are calculated based on completed appointments. Commission rates and payout 
                  schedules are set by your shop owner. Tips are paid out with your regular commission payments.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}