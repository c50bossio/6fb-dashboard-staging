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

  return (
    <div className="space-y-6">

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={CurrencyDollarIcon}
          title="Monthly Revenue"
          value={`$${(metrics.revenue || 145000).toLocaleString()}`}
          change="+12.5%"
          trend="up"
          subtitle="vs last month"
        />
        <MetricCard
          icon={UserGroupIcon}
          title="Total Customers"
          value={(metrics.customers || 1210).toLocaleString()}
          change="+8.3%"
          trend="up"
          subtitle="Active this month"
        />
        <MetricCard
          icon={ChartBarIcon}
          title="Appointments"
          value={(metrics.appointments || 324).toLocaleString()}
          change="+15%"
          trend="up"
          subtitle="This month"
        />
        <MetricCard
          icon={StarIcon}
          title="Satisfaction"
          value={(metrics.satisfaction || 4.65).toFixed(2)}
          change="+0.2"
          trend="up"
          subtitle="Average rating"
        />
      </div>

      {/* Strategic Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LightBulbIcon className="h-6 w-6 text-amber-500" />
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

      {/* Performance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TrendCard
          title="Revenue Trend"
          data={[
            { month: 'Jan', value: 120000 },
            { month: 'Feb', value: 125000 },
            { month: 'Mar', value: 118000 },
            { month: 'Apr', value: 135000 },
            { month: 'May', value: 142000 },
            { month: 'Jun', value: 145000 }
          ]}
        />
        <TrendCard
          title="Customer Growth"
          data={[
            { month: 'Jan', value: 980 },
            { month: 'Feb', value: 1020 },
            { month: 'Mar', value: 1080 },
            { month: 'Apr', value: 1120 },
            { month: 'May', value: 1180 },
            { month: 'Jun', value: 1210 }
          ]}
        />
      </div>
    </div>
  )
}

// Helper Components
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
              insight.priority === 'high' ? 'bg-red-100 text-red-700' :
              insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
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