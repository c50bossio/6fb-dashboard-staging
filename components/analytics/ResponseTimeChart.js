'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'

export default function ResponseTimeChart({ data }) {
  // Format data for histogram
  const chartData = data.map((bucket, index) => ({
    range: bucket.range,
    count: bucket.count,
    percentage: bucket.percentage,
    fill: getBarColor(index, bucket.range)
  }))

  // Calculate statistics
  const stats = calculateStats(data)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Response Time Distribution</h2>
        <p className="text-sm text-gray-600 mt-1">Query response times grouped by duration</p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="range"
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Response Time (seconds)', position: 'insideBottom', offset: -5, style: { fontSize: 12, fill: '#6B7280' } }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Number of Queries', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              radius={[8, 8, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="percentage"
                position="top"
                formatter={(value) => `${value}%`}
                style={{ fontSize: 11, fill: '#6B7280', fontWeight: 'bold' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Performance Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="text-sm text-gray-600 mb-1">Fast Responses</div>
            <div className="text-2xl font-bold text-green-700">
              {stats.fastPercentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">&lt; 10 seconds</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
            <div className="text-sm text-gray-600 mb-1">Medium Responses</div>
            <div className="text-2xl font-bold text-amber-700">
              {stats.mediumPercentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">10-20 seconds</div>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-red-50 to-rose-50 rounded-lg border border-red-200">
            <div className="text-sm text-gray-600 mb-1">Slow Responses</div>
            <div className="text-2xl font-bold text-red-700">
              {stats.slowPercentage}%
            </div>
            <div className="text-xs text-gray-500 mt-1">&gt; 20 seconds</div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Median Response Time</span>
              <span className="text-sm text-gray-500">P50</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.medianRange}</div>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">95th Percentile</span>
              <span className="text-sm text-gray-500">P95</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{stats.p95Range}</div>
          </div>
        </div>

        {/* Performance Assessment */}
        <div className={`mt-6 p-4 rounded-lg border ${getPerformanceStyle(stats.fastPercentage)}`}>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {stats.fastPercentage >= 70 ? (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : stats.fastPercentage >= 50 ? (
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              ) : (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">
                {getPerformanceTitle(stats.fastPercentage)}
              </h3>
              <p className="text-sm text-gray-600">
                {getPerformanceMessage(stats.fastPercentage)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Custom tooltip
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{data.range} seconds</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-600">Queries:</span>
          <span className="font-medium text-gray-900">{data.count}</span>
        </div>
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-600">Percentage:</span>
          <span className="font-medium text-gray-900">{data.percentage}%</span>
        </div>
      </div>
    </div>
  )
}

// Get bar color based on response time
function getBarColor(index, range) {
  if (range.includes('0-5')) return '#10B981' // Fast - Green
  if (range.includes('5-10')) return '#3B82F6' // Good - Blue
  if (range.includes('10-15')) return '#F59E0B' // Medium - Amber
  if (range.includes('15-20')) return '#F97316' // Slow - Orange
  return '#EF4444' // Very slow - Red
}

// Calculate statistics
function calculateStats(data) {
  const totalQueries = data.reduce((sum, bucket) => sum + bucket.count, 0)

  // Calculate fast, medium, slow percentages
  const fastCount = (data.find(b => b.range === '0-5')?.count || 0) +
                   (data.find(b => b.range === '5-10')?.count || 0)
  const mediumCount = (data.find(b => b.range === '10-15')?.count || 0) +
                     (data.find(b => b.range === '15-20')?.count || 0)
  const slowCount = data.find(b => b.range === '20+')?.count || 0

  const fastPercentage = totalQueries > 0 ? Math.round((fastCount / totalQueries) * 100) : 0
  const mediumPercentage = totalQueries > 0 ? Math.round((mediumCount / totalQueries) * 100) : 0
  const slowPercentage = totalQueries > 0 ? Math.round((slowCount / totalQueries) * 100) : 0

  // Estimate median and P95
  const medianRange = estimateMedianRange(data, totalQueries)
  const p95Range = estimateP95Range(data, totalQueries)

  return {
    fastPercentage,
    mediumPercentage,
    slowPercentage,
    medianRange,
    p95Range
  }
}

// Estimate median range
function estimateMedianRange(data, total) {
  const halfPoint = total / 2
  let cumulative = 0

  for (const bucket of data) {
    cumulative += bucket.count
    if (cumulative >= halfPoint) {
      return bucket.range + 's'
    }
  }

  return '10-15s'
}

// Estimate P95 range
function estimateP95Range(data, total) {
  const p95Point = total * 0.95
  let cumulative = 0

  for (const bucket of data) {
    cumulative += bucket.count
    if (cumulative >= p95Point) {
      return bucket.range + 's'
    }
  }

  return '15-20s'
}

// Get performance style
function getPerformanceStyle(fastPercentage) {
  if (fastPercentage >= 70) {
    return 'bg-green-50 border-green-200'
  } else if (fastPercentage >= 50) {
    return 'bg-amber-50 border-amber-200'
  } else {
    return 'bg-red-50 border-red-200'
  }
}

// Get performance title
function getPerformanceTitle(fastPercentage) {
  if (fastPercentage >= 70) {
    return 'Excellent Performance'
  } else if (fastPercentage >= 50) {
    return 'Good Performance'
  } else {
    return 'Needs Optimization'
  }
}

// Get performance message
function getPerformanceMessage(fastPercentage) {
  if (fastPercentage >= 70) {
    return 'Most queries are responding quickly. Your AI agents are performing well.'
  } else if (fastPercentage >= 50) {
    return 'Performance is acceptable but there is room for improvement. Consider optimizing slower queries.'
  } else {
    return 'Many queries are taking longer than expected. Review agent configurations and query complexity.'
  }
}
