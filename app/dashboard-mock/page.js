'use client'

import { TrendingUp, TrendingDown, Users, Calendar, DollarSign, Star } from 'lucide-react'
import { useState, useEffect } from 'react'

// Mock dashboard with actual cards displaying data
export default function DashboardMock() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    console.log('📊 MOCK DASHBOARD: Loaded with sample data cards')
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mock dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
              <p className="text-sm text-gray-500">Mock data demonstration</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Mock Mode</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">Revenue</span>
              </div>
              <div className="flex items-center text-green-600 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                +12.5%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">$15,750</div>
            <p className="text-sm text-gray-500 mt-1">This month</p>
          </div>

          {/* Appointments Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">Appointments</span>
              </div>
              <div className="flex items-center text-green-600 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                +8.3%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">127</div>
            <p className="text-sm text-gray-500 mt-1">42 upcoming</p>
          </div>

          {/* Customers Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">Customers</span>
              </div>
              <div className="flex items-center text-green-600 text-sm">
                <TrendingUp className="h-4 w-4 mr-1" />
                +15.2%
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">89</div>
            <p className="text-sm text-gray-500 mt-1">12 new this month</p>
          </div>

          {/* Rating Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
                <span className="ml-3 text-sm font-medium text-gray-500">Rating</span>
              </div>
              <div className="flex items-center text-gray-600 text-sm">
                34 reviews
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">4.8</div>
            <div className="flex items-center mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64 flex items-end justify-between space-x-2">
              {[65, 72, 85, 78, 82, 88, 92].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Services */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h3>
            <div className="space-y-4">
              {[
                { name: 'Premium Haircut', count: 45, revenue: '$2,250' },
                { name: 'Beard Trim', count: 38, revenue: '$1,140' },
                { name: 'Hot Towel Shave', count: 28, revenue: '$1,400' },
                { name: 'Hair Color', count: 16, revenue: '$1,280' }
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      <span className="text-sm text-gray-500">{service.revenue}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(service.count / 45) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{service.count} bookings</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { time: '2 hours ago', event: 'New booking: John Smith - Premium Haircut', type: 'booking' },
              { time: '3 hours ago', event: 'Payment received: $85.00', type: 'payment' },
              { time: '5 hours ago', event: 'New customer registered: Mike Johnson', type: 'customer' },
              { time: '1 day ago', event: '5-star review from David Lee', type: 'review' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  activity.type === 'booking' ? 'bg-blue-500' :
                  activity.type === 'payment' ? 'bg-green-500' :
                  activity.type === 'customer' ? 'bg-purple-500' :
                  'bg-yellow-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{activity.event}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}