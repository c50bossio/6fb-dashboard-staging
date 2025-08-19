'use client'

import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  StarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function ExecutiveSummary({ data }) {
  const metrics = data?.metrics || {}
  const insights = data?.insights || []
  const businessInsights = data?.business_insights || {}
  const systemHealth = data?.system_health || {}
  const todayMetrics = data?.todayMetrics || {}
  
  // Calculate dynamic values based on real data
  const revenueGrowth = businessInsights.revenue_growth || 0
  const hasRealData = systemHealth.data_source !== 'error'
  
  // Format values safely
  const formatValue = (value, defaultValue = 0) => {
    return typeof value === 'number' ? value : defaultValue
  }

  return (
    <div className="space-y-6">
      {/* Data Source Indicator */}
      {systemHealth.data_source && (
        <div className="text-xs text-gray-500 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${hasRealData ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>
            Data Source: {systemHealth.data_source === 'supabase_enhanced' ? 'Live Database' : 
                        systemHealth.data_source === 'error' ? 'Connection Error' : 
                        systemHealth.data_source}
          </span>
          {systemHealth.last_updated && (
            <span>• Updated: {new Date(systemHealth.last_updated).toLocaleTimeString()}</span>
          )}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CurrencyDollarIcon}
          title="Total Revenue"
          value={`$${formatValue(metrics.revenue).toLocaleString()}`}
          change={revenueGrowth > 0 ? `+${revenueGrowth.toFixed(1)}%` : `${revenueGrowth.toFixed(1)}%`}
          trend={revenueGrowth >= 0 ? "up" : "down"}
          subtitle="All time"
        />
        <MetricCard
          icon={UserGroupIcon}
          title="Total Customers"
          value={formatValue(metrics.customers).toLocaleString()}
          change={`+${businessInsights.total_ai_recommendations || 0}`}
          trend="up"
          subtitle="Active customers"
        />
        <MetricCard
          icon={ChartBarIcon}
          title="Appointments"
          value={formatValue(metrics.appointments).toLocaleString()}
          change={`${formatValue(todayMetrics.bookings)} today`}
          trend="up"
          subtitle="Total bookings"
        />
        <MetricCard
          icon={StarIcon}
          title="Satisfaction"
          value={formatValue(metrics.satisfaction, 4.5).toFixed(1)}
          change={businessInsights.appointment_completion_rate ? 
            `${Math.round(businessInsights.appointment_completion_rate)}% completion` : 
            "N/A"}
          trend="up"
          subtitle="Customer rating"
        />
      </div>

      {/* Strategic Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LightBulbIcon className="h-6 w-6 text-amber-700" />
          Strategic Insights
        </h3>
        
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <InsightCard key={index} insight={insight} />
          ))}
          
          {insights.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Analyzing your business data for insights...
            </p>
          )}
        </div>
      </div>

      {/* Performance Trends - Only show if we have real trend data */}
      {data?.trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.trends.revenue && (
            <TrendCard
              title="Revenue Trend"
              data={data.trends.revenue}
            />
          )}
          {data.trends.customers && (
            <TrendCard
              title="Customer Growth"
              data={data.trends.customers}
            />
          )}
        </div>
      )}
      
      {/* Show placeholder when no trend data available */}
      {!data?.trends && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center text-gray-500">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-sm">Performance trends will appear here once we have enough historical data</p>
          </div>
        </div>
      )}
    </div>
  )
}

const MetricCard = ({ icon: Icon, title, value, change, trend, subtitle }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <div className="flex items-start justify-between mb-4">
      <div className="p-2 bg-indigo-50 rounded-lg">
        <Icon className="h-6 w-6 text-olive-600" />
      </div>
      <div className={`flex items-center gap-1 text-sm font-medium ${
        trend === 'up' ? 'text-green-600' : 'text-red-600'
      }`}>
        {trend === 'up' ? (
          <ArrowTrendingUpIcon className="h-4 w-4" />
        ) : (
          <ArrowTrendingDownIcon className="h-4 w-4" />
        )}
        {change}
      </div>
    </div>
    <div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-600 mt-1">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  </div>
)

const InsightCard = ({ insight }) => {
  const icons = {
    opportunity: LightBulbIcon,
    alert: ExclamationTriangleIcon,
    success: CheckCircleIcon
  }
  
  const colors = {
    opportunity: 'bg-amber-50 border-amber-200 text-amber-800',
    alert: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }
  
  const Icon = icons[insight.type] || LightBulbIcon
  
  return (
    <div className={`p-4 rounded-lg border ${colors[insight.type]}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">{insight.message}</p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              insight.priority === 'high' ? 'bg-softred-100 text-softred-800' :
              insight.priority === 'medium' ? 'bg-amber-100 text-amber-900' :
              'bg-gray-100 text-gray-700'
            }`}>
              {insight.priority} priority
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const TrendCard = ({ title, data }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h4 className="text-lg font-semibold text-gray-900 mb-4">{title}</h4>
    <div className="h-48 flex items-end justify-between gap-2">
      {data.map((item, index) => {
        const maxValue = Math.max(...data.map(d => d.value))
        const height = (item.value / maxValue) * 100
        
        return (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t"
              style={{ height: `${height}%` }}
            />
            <span className="text-xs text-gray-500 mt-2">{item.month}</span>
          </div>
        )
      })}
    </div>
  </div>
)