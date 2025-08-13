'use client'

import ProtectedRoute from '../../../../components/ProtectedRoute'
import GlobalNavigation from '../../../../components/GlobalNavigation'
import CapacityPlanningPanel from '../../../../components/dashboard/CapacityPlanningPanel'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import {
  WrenchScrewdriverIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  LightBulbIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function CapacityPlanningPage() {
  const { user, profile } = useAuth()

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content - adjusting for sidebar */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header with Navigation */}
              <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <Link
                    href="/dashboard/operations"
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                    <span className="text-sm">Back to Operations</span>
                  </Link>
                </div>
                
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl flex items-center gap-3">
                      <WrenchScrewdriverIcon className="h-10 w-10 text-blue-600" />
                      Capacity Planning
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      AI-powered capacity optimization and demand forecasting for {profile?.barbershop_name || 'your barbershop'}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center space-x-4 md:mt-0">
                    <div className="flex items-center gap-2">
                      <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                        AI Enhanced
                      </div>
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        Real-time Data
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <ChartBarIcon className="h-6 w-6 text-blue-500" />
                    <h3 className="font-semibold">Demand Forecasting</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    AI analyzes historical patterns to predict future demand and optimal capacity requirements.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <CalendarDaysIcon className="h-6 w-6 text-green-500" />
                    <h3 className="font-semibold">Schedule Optimization</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Optimize staff scheduling and resource allocation based on predicted demand patterns.
                  </p>
                </div>
                
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <LightBulbIcon className="h-6 w-6 text-purple-500" />
                    <h3 className="font-semibold">Smart Recommendations</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Get actionable insights for capacity expansion, efficiency improvements, and revenue optimization.
                  </p>
                </div>
              </div>

              {/* Main Capacity Planning Component */}
              <CapacityPlanningPanel barbershop_id={profile?.shop_id || 'demo'} />

              {/* Additional Resources */}
              <div className="mt-8 bg-blue-50 rounded-lg border border-blue-200 p-6">
                <div className="flex items-start gap-4">
                  <LightBulbIcon className="h-6 w-6 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">
                      💡 Getting the Most from Capacity Planning
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <h4 className="font-medium mb-1">📊 Data Quality</h4>
                        <p className="mb-3">Ensure accurate booking and customer data for better predictions.</p>
                        
                        <h4 className="font-medium mb-1">🔄 Regular Review</h4>
                        <p>Check recommendations weekly to adapt to changing patterns.</p>
                      </div>
                      <div>
                        <h4 className="font-medium mb-1">⚡ Quick Implementation</h4>
                        <p className="mb-3">Start with high-impact, low-effort recommendations first.</p>
                        
                        <h4 className="font-medium mb-1">📈 Track Results</h4>
                        <p>Monitor the impact of implemented changes on utilization and revenue.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/dashboard/analytics-enhanced"
                  className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <ChartBarIcon className="h-6 w-6 text-blue-500" />
                  <div>
                    <h3 className="font-medium">Enhanced Analytics</h3>
                    <p className="text-sm text-gray-600">View detailed performance metrics</p>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/calendar"
                  className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <CalendarDaysIcon className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-medium">Calendar & Scheduling</h3>
                    <p className="text-sm text-gray-600">Manage appointments and scheduling</p>
                  </div>
                </Link>
                
                <Link
                  href="/dashboard/ai-intelligent"
                  className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <LightBulbIcon className="h-6 w-6 text-purple-500" />
                  <div>
                    <h3 className="font-medium">AI Intelligence</h3>
                    <p className="text-sm text-gray-600">Advanced AI insights and recommendations</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}