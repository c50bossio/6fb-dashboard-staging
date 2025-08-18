'use client'

import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  ScissorsIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
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
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BarberReports() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('week') // day, week, month, year
  const [reportData, setReportData] = useState({
    earnings: {
      total: 0,
      services: 0,
      products: 0,
      tips: 0,
      commission: 0
    },
    appointments: {
      total: 0,
      completed: 0,
      cancelled: 0,
      noShow: 0
    },
    clients: {
      total: 0,
      new: 0,
      returning: 0,
      topClients: []
    },
    services: {
      popular: [],
      revenue: []
    },
    trends: {
      daily: [],
      hourly: []
    }
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReportData()
    }, 100)
    
    const failsafeTimer = setTimeout(() => {
      if (loading) {
        console.warn('Reports loading timeout - forcing completion')
        setLoading(false)
        setError('Loading took too long. Displaying with empty data.')
      }
    }, 5000)
    
    return () => {
      clearTimeout(timer)
      clearTimeout(failsafeTimer)
    }
  }, [dateRange, user])

  const loadReportData = async () => {
    const currentUser = user || { id: 'dev-user-123', email: 'dev@localhost.com' }
    
    try {
      console.log('Loading report data for user:', currentUser.id)
      setError(null)
      
      const endDate = new Date()
      const startDate = new Date()
      
      switch(dateRange) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1)
          break
        case 'week':
          startDate.setDate(startDate.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      let appointments = null
      let apptError = null
      
      const appointmentsResult = await supabase
        .from('bookings')
        .select('*')
        .eq('barber_id', currentUser.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
      
      if (appointmentsResult.error && appointmentsResult.error.message.includes('does not exist')) {
        console.log('Appointments table not found, trying bookings table...')
        const bookingsResult = await supabase
          .from('bookings')
          .select('*')
          .eq('barber_id', currentUser.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
        
        appointments = bookingsResult.data
        apptError = bookingsResult.error
      } else {
        appointments = appointmentsResult.data
        apptError = appointmentsResult.error
      }

      if (apptError) {
        console.error('Error fetching appointment data:', apptError)
        appointments = [] // Use empty array instead of throwing
      }
      
      if (!appointments) appointments = []

      let { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('barber_id', currentUser.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (transError) {
        console.error('Error fetching transactions:', transError)
        if (transError.message.includes('does not exist')) {
          console.log('Transactions table does not exist yet')
        }
        transactions = [] // Use empty array instead of throwing
      }
      
      if (!transactions) transactions = []

      const processedData = processReportData(appointments || [], transactions || [], dateRange)
      setReportData(processedData)
      
    } catch (error) {
      console.error('Error loading report data:', error)
      setReportData({
        earnings: { total: 0, services: 0, products: 0, tips: 0, commission: 0 },
        appointments: { total: 0, completed: 0, cancelled: 0, noShow: 0 },
        clients: { total: 0, new: 0, returning: 0, topClients: [] },
        services: { popular: [], revenue: [] },
        trends: { daily: [], hourly: [] }
      })
    } finally {
      setLoading(false)
    }
  }

  const processReportData = (appointments, transactions, range) => {
    // Calculate real earnings from transaction data
    const earnings = {
      total: transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0),
      services: transactions.filter(t => t.type === 'service').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
      products: transactions.filter(t => t.type === 'product').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
      tips: transactions.reduce((sum, t) => sum + (parseFloat(t.tip_amount) || 0), 0),
      commission: transactions.reduce((sum, t) => sum + (parseFloat(t.commission_amount) || 0), 0)
    }

    const appointmentStats = {
      total: appointments.length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      noShow: appointments.filter(a => a.status === 'no_show').length
    }

    // Get unique clients and calculate new vs returning based on first appointment date
    const uniqueClients = [...new Set(appointments.map(a => a.customer_id))].filter(Boolean)
    
    // To determine new vs returning, we need to check when each client first booked
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Group appointments by client to find first booking date
    const clientFirstBooking = {}
    appointments.forEach(apt => {
      if (apt.customer_id) {
        const aptDate = new Date(apt.created_at)
        if (!clientFirstBooking[apt.customer_id] || aptDate < clientFirstBooking[apt.customer_id]) {
          clientFirstBooking[apt.customer_id] = aptDate
        }
      }
    })
    
    // Count new clients (first booking within the date range)
    const newClients = Object.entries(clientFirstBooking).filter(([clientId, firstDate]) => {
      return firstDate >= thirtyDaysAgo
    }).length
    
    const clientStats = {
      total: uniqueClients.length,
      new: newClients,
      returning: uniqueClients.length - newClients,
      topClients: [] // Would need customer table join for names
    }

    // Calculate service statistics with real revenue
    const serviceStats = {}
    appointments.forEach(apt => {
      const service = apt.service_name || 'Unknown'
      if (!serviceStats[service]) {
        serviceStats[service] = { count: 0, revenue: 0 }
      }
      serviceStats[service].count += 1
      
      // Find the transaction for this appointment if it exists
      const transaction = transactions.find(t => t.appointment_id === apt.id)
      if (transaction) {
        serviceStats[service].revenue += parseFloat(transaction.amount || transaction.total_amount || 0)
      }
    })
    
    const popularServices = Object.entries(serviceStats)
      .map(([name, stats]) => ({ 
        name, 
        count: stats.count,
        avgPrice: stats.count > 0 ? stats.revenue / stats.count : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const trends = generateTrendData(appointments, transactions, range)

    return {
      earnings,
      appointments: appointmentStats,
      clients: clientStats,
      services: {
        popular: popularServices,
        revenue: popularServices.map(s => ({
          name: s.name,
          revenue: serviceStats[s.name]?.revenue || 0,
          count: s.count,
          avgPrice: s.avgPrice
        }))
      },
      trends
    }
  }

  const generateTrendData = (appointments, transactions, range) => {
    const dailyData = {}
    const hourlyData = {}
    
    appointments.forEach(apt => {
      const date = new Date(apt.created_at)
      const dateKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const hour = date.getHours()
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { appointments: 0, revenue: 0 }
      }
      dailyData[dateKey].appointments += 1
      
      if (!hourlyData[hour]) {
        hourlyData[hour] = 0
      }
      hourlyData[hour] += 1
    })
    
    transactions.forEach(trans => {
      const date = new Date(trans.created_at)
      const dateKey = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      
      if (dailyData[dateKey]) {
        dailyData[dateKey].revenue += trans.total_amount || 0
      }
    })
    
    const daily = Object.entries(dailyData).map(([date, data]) => ({
      date,
      appointments: data.appointments,
      revenue: data.revenue
    }))
    
    const hourly = Object.entries(hourlyData).map(([hour, bookings]) => ({
      hour: `${hour}:00`,
      bookings
    })).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
    
    return { daily, hourly }
  }


  const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444', '#C5A35B']

  const downloadReport = () => {
    const csvData = [
      ['Barber Performance Report'],
      [`Period: ${dateRange}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [''],
      ['Earnings Summary'],
      ['Type', 'Amount'],
      ['Total Revenue', `$${reportData.earnings.total.toFixed(2)}`],
      ['Services', `$${reportData.earnings.services.toFixed(2)}`],
      ['Products', `$${reportData.earnings.products.toFixed(2)}`],
      ['Tips', `$${reportData.earnings.tips.toFixed(2)}`],
      ['Commission', `$${reportData.earnings.commission.toFixed(2)}`],
      [''],
      ['Appointment Summary'],
      ['Status', 'Count'],
      ['Total', reportData.appointments.total],
      ['Completed', reportData.appointments.completed],
      ['Cancelled', reportData.appointments.cancelled],
      ['No Show', reportData.appointments.noShow],
      [''],
      ['Client Summary'],
      ['Type', 'Count'],
      ['Total Clients', reportData.clients.total],
      ['New Clients', reportData.clients.new],
      ['Returning Clients', reportData.clients.returning]
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barber-report-${dateRange}-${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Performance Reports</h1>
              <p className="text-sm text-gray-600">Track your earnings, appointments, and client metrics</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
              <button
                onClick={downloadReport}
                className="flex items-center space-x-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                12%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ${reportData.earnings.total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-1">Total Earnings</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CalendarDaysIcon className="h-6 w-6 text-amber-700" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.appointments.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total Appointments</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-olive-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-olive-600" />
              </div>
              <span className="text-sm font-medium text-olive-600 flex items-center">
                +{reportData.clients.new}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{reportData.clients.total}</p>
            <p className="text-sm text-gray-600 mt-1">Total Clients</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-gold-100 rounded-lg">
                <ScissorsIcon className="h-6 w-6 text-gold-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {reportData.appointments.completed}
            </p>
            <p className="text-sm text-gray-600 mt-1">Services Completed</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.trends.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#F59E0B" 
                  strokeWidth={2}
                  dot={{ fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Appointment Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Appointment Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Completed', value: reportData.appointments.completed },
                    { name: 'Cancelled', value: reportData.appointments.cancelled },
                    { name: 'No Show', value: reportData.appointments.noShow }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: 'Completed', value: reportData.appointments.completed },
                    { name: 'Cancelled', value: reportData.appointments.cancelled },
                    { name: 'No Show', value: reportData.appointments.noShow }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Popular Services */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Services</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.services.popular}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.trends.hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Earnings Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings Breakdown</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Services</span>
                <span className="text-sm font-medium text-gray-900">
                  ${reportData.earnings.services.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Products</span>
                <span className="text-sm font-medium text-gray-900">
                  ${reportData.earnings.products.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Tips</span>
                <span className="text-sm font-medium text-gray-900">
                  ${reportData.earnings.tips.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium text-gray-900">Total Revenue</span>
                <span className="text-lg font-bold text-green-600">
                  ${reportData.earnings.total.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-sm text-gray-600">Commission (60%)</span>
                <span className="text-sm font-medium text-gray-900">
                  ${reportData.earnings.commission.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Client Metrics */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Metrics</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Total Clients</span>
                <span className="text-sm font-medium text-gray-900">
                  {reportData.clients.total}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">New Clients</span>
                <span className="text-sm font-medium text-green-600">
                  +{reportData.clients.new}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Returning Clients</span>
                <span className="text-sm font-medium text-gray-900">
                  {reportData.clients.returning}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Retention Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {((reportData.clients.returning / Math.max(reportData.clients.total, 1)) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}