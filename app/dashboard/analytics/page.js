'use client'

import { useState, useEffect } from 'react'
import { 
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  TrendingUpIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('7d')
  const [analytics, setAnalytics] = useState({})
  const [campaignPerformance, setCampaignPerformance] = useState([])

  useEffect(() => {
    // Mock analytics data (replace with real API calls)
    setAnalytics({
      totalRevenue: 12450,
      revenueChange: 8.2,
      totalCustomers: 156,
      customerChange: 12.5,
      campaignsSent: 24,
      campaignsChange: 15.3,
      avgOpenRate: 32.4,
      openRateChange: -2.1,
      emailDeliveryRate: 97.8,
      smsDeliveryRate: 94.2,
      customerRetention: 78.5,
      appointmentBookings: 73
    })

    setCampaignPerformance([
      {
        date: '2025-07-24',
        emailsSent: 45,
        smsSent: 23,
        emailOpenRate: 28.9,
        smsResponseRate: 14.2,
        newBookings: 6
      },
      {
        date: '2025-07-25', 
        emailsSent: 67,
        smsSent: 34,
        emailOpenRate: 31.2,
        smsResponseRate: 16.8,
        newBookings: 9
      },
      {
        date: '2025-07-26',
        emailsSent: 52,
        smsSent: 28,
        emailOpenRate: 29.7,
        smsResponseRate: 12.5,
        newBookings: 7
      },
      {
        date: '2025-07-27',
        emailsSent: 38,
        smsSent: 19,
        emailOpenRate: 33.1,
        smsResponseRate: 18.9,
        newBookings: 5
      },
      {
        date: '2025-07-28',
        emailsSent: 71,
        smsSent: 41,
        emailOpenRate: 35.4,
        smsResponseRate: 15.3,
        newBookings: 11
      },
      {
        date: '2025-07-29',
        emailsSent: 59,
        smsSent: 32,
        emailOpenRate: 30.8,
        smsResponseRate: 13.7,
        newBookings: 8
      },
      {
        date: '2025-07-30',
        emailsSent: 47,
        smsSent: 25,
        emailOpenRate: 34.2,
        smsResponseRate: 17.1,
        newBookings: 6
      }
    ])
  }, [timeRange])

  const formatChange = (value) => {
    const isPositive = value > 0
    const Icon = isPositive ? ArrowUpIcon : ArrowDownIcon
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600'
    
    return (
      <div className={`flex items-center ${colorClass}`}>
        <Icon className="h-4 w-4 mr-1" />
        <span>{Math.abs(value)}%</span>
      </div>
    )
  }

  const MetricCard = ({ title, value, change, icon: Icon, format = 'number' }) => (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {format === 'currency' ? `$${value.toLocaleString()}` : 
             format === 'percentage' ? `${value}%` : 
             value.toLocaleString()}
          </p>
          {change && (
            <div className="mt-1">
              {formatChange(change)}
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-100 rounded-lg">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-gray-600">Track your marketing performance and business metrics</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="input-field w-32"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="btn-secondary">
                Export Report
              </button>
            </div>
          </div>
        </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={analytics.totalRevenue}
            change={analytics.revenueChange}
            icon={CurrencyDollarIcon}
            format="currency"
          />
          <MetricCard
            title="Total Customers"
            value={analytics.totalCustomers}
            change={analytics.customerChange}
            icon={UserGroupIcon}
          />
          <MetricCard
            title="Campaigns Sent"
            value={analytics.campaignsSent}
            change={analytics.campaignsChange}
            icon={ChartBarIcon}
          />
          <MetricCard
            title="Avg Open Rate"
            value={analytics.avgOpenRate}
            change={analytics.openRateChange}
            icon={TrendingUpIcon}
            format="percentage"
          />
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Campaign Performance */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Performance</h3>
            <div className="space-y-4">
              {campaignPerformance.slice(-5).map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {new Date(day.date).toLocaleDateString()}
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <div className="flex items-center text-blue-600">
                      <EnvelopeIcon className="h-4 w-4 mr-1" />
                      {day.emailsSent} emails
                    </div>
                    <div className="flex items-center text-green-600">
                      <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                      {day.smsSent} SMS
                    </div>
                    <div className="text-purple-600">
                      {day.newBookings} bookings
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Rates */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Rates</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Email Delivery Rate</span>
                  <span className="font-medium">{analytics.emailDeliveryRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${analytics.emailDeliveryRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">SMS Delivery Rate</span>
                  <span className="font-medium">{analytics.smsDeliveryRate}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${analytics.smsDeliveryRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Customer Retention</span>
                  <span className="font-medium">{analytics.customerRetention}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full" 
                    style={{ width: `${analytics.customerRetention}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Performance Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Daily Performance</h3>
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Emails Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email Open Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SMS Response Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    New Bookings
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaignPerformance.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(day.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.emailsSent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.smsSent}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.emailOpenRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.smsResponseRate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {day.newBookings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}