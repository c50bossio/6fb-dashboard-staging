'use client'

import { 
  ArrowPathIcon,
  ChartBarIcon,
  UsersIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

export default function ExecutiveLoadingState() {
  return (
    <div className="space-y-6">
      {/* Header Loading */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center mb-4">
          <div className="relative">
            <ArrowPathIcon className="h-8 w-8 text-blue-500 animate-spin" />
            <div className="absolute -inset-2 bg-blue-50 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading Executive Overview</h3>
          <p className="text-sm text-gray-500">Analyzing your business data...</p>
        </div>
      </div>

      {/* Metrics Cards Loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        </div>

        {/* Customers Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>

        {/* Appointments Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-20"></div>
            </div>
          </div>
        </div>

        {/* Performance Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-18"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Area Loading */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="h-6 bg-gray-200 rounded w-40 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-64"></div>
          </div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Loading analytics chart...</p>
          </div>
        </div>
      </div>

      {/* Loading Progress Indicators */}
      <div className="flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-gray-500">Revenue data</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <span className="text-xs text-gray-500">Customer metrics</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <span className="text-xs text-gray-500">Appointments</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
          <span className="text-xs text-gray-500">Analytics</span>
        </div>
      </div>
    </div>
  )
}