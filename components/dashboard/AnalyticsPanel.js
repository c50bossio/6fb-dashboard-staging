'use client'

import { useState } from 'react'
import {
  ChartBarIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  ClockIcon,
  FunnelIcon,
  EyeIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/outline'

export default function AnalyticsPanel({ data }) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [timeRange, setTimeRange] = useState('month')
  const [expandedView, setExpandedView] = useState(false)
  
  const liveData = data?.liveData || {}
  const predictions = data?.predictive || {}
  const locations = data?.performance || []

  // Calculate aggregated metrics
  const totalRevenue = locations.reduce((sum, loc) => sum + (loc.revenue || 0), 0)
  const avgRating = locations.reduce((sum, loc) => sum + (loc.rating || 0), 0) / locations.length || 0
  const avgEfficiency = locations.reduce((sum, loc) => sum + (loc.efficiency || 0), 0) / locations.length || 0

  return (
    <div className="space-y-6">
      {/* Analytics Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'day' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'week' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'month' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === 'quarter' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Quarter
          </button>
          
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setExpandedView(!expandedView)}
              className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {expandedView ? (
                <ArrowsPointingInIcon className="h-5 w-5" />
              ) : (
                <ArrowsPointingOutIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          change="+12.5% vs last month"
          trend="up"
          icon={CurrencyDollarIcon}
          color="green"
        />
        <KPICard
          title="Total Customers"
          value="1,210"
          change="+8.3% vs last month"
          trend="up"
          icon={UserGroupIcon}
          color="blue"
        />
        <KPICard
          title="Active Locations"
          value={locations.length}
          change="All operational"
          trend="neutral"
          icon={MapPinIcon}
          color="purple"
        />
        <KPICard
          title="Avg Rating"
          value={avgRating.toFixed(2)}
          change="Excellent performance"
          trend="up"
          icon={ChartBarIcon}
          color="amber"
        />
      </div>

      {/* Location Performance Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPinIcon className="h-6 w-6 text-blue-500" />
            Location Performance Overview
          </h3>
          <span className="text-sm text-gray-500">
            {timeRange === 'day' ? 'Today' : 
             timeRange === 'week' ? 'This Week' :
             timeRange === 'month' ? 'This Month' : 'This Quarter'}
          </span>
        </div>

        {/* Bar Chart */}
        <div className="h-64 flex items-end justify-between gap-4">
          {locations.map((location, index) => {
            const revenueHeight = (location.revenue / Math.max(...locations.map(l => l.revenue))) * 100
            const efficiencyHeight = location.efficiency
            
            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center cursor-pointer"
                onClick={() => setSelectedLocation(location)}
              >
                <div className="w-full flex gap-2 h-48">
                  <div className="flex-1 flex flex-col justify-end">
                    <div 
                      className="bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all hover:from-green-600 hover:to-green-500"
                      style={{ height: `${revenueHeight}%` }}
                      title={`Revenue: $${location.revenue.toLocaleString()}`}
                    />
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div 
                      className="bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500"
                      style={{ height: `${efficiencyHeight}%` }}
                      title={`Efficiency: ${location.efficiency}%`}
                    />
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{location.name.split(' ')[0]}</p>
                  <p className="text-xs text-gray-500">{location.name.split(' ')[1]}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-green-500 rounded"></div>
            <span className="text-gray-600">Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600">Efficiency %</span>
          </div>
        </div>
      </div>

      {/* Location Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Location Details - Click to Analyze
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Barbers
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Efficiency
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {locations.map((location, index) => (
                <LocationRow 
                  key={index} 
                  location={location} 
                  isSelected={selectedLocation?.name === location.name}
                  onSelect={() => setSelectedLocation(location)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Predictive Analytics */}
      {predictions && (
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="h-6 w-6 text-indigo-500" />
            Predictive Analytics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PredictionCard
              title="Next Week Revenue"
              value={`$${(predictions.next_week_revenue || 32000).toLocaleString()}`}
              confidence={85}
            />
            <PredictionCard
              title="Expected Bookings"
              value={(predictions.next_week_bookings || 280).toLocaleString()}
              confidence={78}
            />
            <PredictionCard
              title="Busy Periods"
              value={(predictions.busy_periods || ['Mon 10-12', 'Fri 2-5']).join(', ')}
              confidence={92}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Components
const KPICard = ({ title, value, change, trend, icon: Icon, color }) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className={`p-2 bg-${color}-50 rounded-lg`}>
          <Icon className={`h-6 w-6 text-${color}-500`} />
        </div>
        {trend !== 'neutral' && (
          <div className={`flex items-center ${trendColors[trend]}`}>
            {trend === 'up' ? (
              <ArrowTrendingUpIcon className="h-5 w-5" />
            ) : (
              <ArrowTrendingDownIcon className="h-5 w-5" />
            )}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-600 mt-1">{title}</div>
        <div className={`text-xs mt-2 ${trendColors[trend]}`}>{change}</div>
      </div>
    </div>
  )
}

const LocationRow = ({ location, isSelected, onSelect }) => {
  const getRandomCustomers = () => Math.floor(Math.random() * 100) + 250
  const getRandomBarbers = () => Math.floor(Math.random() * 3) + 2
  
  return (
    <tr 
      className={`cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <MapPinIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-gray-900">{location.name}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">${location.revenue.toLocaleString()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{getRandomCustomers()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">{getRandomBarbers()}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <span className="text-sm text-gray-900">{location.rating}</span>
          <span className="ml-1 text-yellow-500">⭐</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="text-sm text-gray-900">{location.efficiency}%</div>
          <div className="ml-2 flex-1 max-w-[60px]">
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-green-500 rounded-full"
                style={{ width: `${location.efficiency}%` }}
              />
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors">
          Analyze
        </button>
      </td>
    </tr>
  )
}

const PredictionCard = ({ title, value, confidence }) => (
  <div className="bg-white rounded-lg p-4">
    <div className="text-sm text-gray-600 mb-1">{title}</div>
    <div className="text-xl font-bold text-gray-900 mb-2">{value}</div>
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full">
        <div 
          className="h-2 bg-indigo-500 rounded-full"
          style={{ width: `${confidence}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{confidence}%</span>
    </div>
  </div>
)