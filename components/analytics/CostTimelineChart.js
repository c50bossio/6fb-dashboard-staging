'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'

export default function CostTimelineChart({ data }) {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date))

  // Calculate trend statistics
  const stats = calculateTrendStats(sortedData)

  // Format data for chart
  const chartData = sortedData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    cost: parseFloat(item.cost.toFixed(4)),
    fullDate: item.date
  }))

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Cost Over Time</h2>
            <p className="text-sm text-gray-600 mt-1">Daily AgentKit query costs in USD</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              ${stats.totalCost.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">Total Cost</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Cost (USD)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="cost"
              stroke="#10B981"
              strokeWidth={3}
              fill="url(#costGradient)"
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              ${stats.avgCost.toFixed(4)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Avg Daily Cost</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              ${stats.peakCost.toFixed(4)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Peak Day Cost</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              ${stats.minCost.toFixed(4)}
            </div>
            <div className="text-xs text-gray-600 mt-1">Min Day Cost</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-bold text-gray-900">
              {stats.trend > 0 ? '+' : ''}{stats.trend.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">Trend</div>
          </div>
        </div>

        {/* Peak cost day highlight */}
        {stats.peakDay && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-900">Peak Cost Day</span>
              </div>
              <div className="text-sm text-gray-700">
                {new Date(stats.peakDay).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })} - <span className="font-bold text-amber-700">${stats.peakCost.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}
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
      <p className="font-semibold text-gray-900 mb-2">
        {new Date(data.fullDate).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-600">Total Cost:</span>
          <span className="font-bold text-green-600">${data.cost.toFixed(4)}</span>
        </div>
      </div>
    </div>
  )
}

// Calculate trend statistics
function calculateTrendStats(data) {
  if (!data || data.length === 0) {
    return {
      totalCost: 0,
      avgCost: 0,
      peakCost: 0,
      minCost: 0,
      peakDay: null,
      trend: 0
    }
  }

  const costs = data.map(d => d.cost)
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0)
  const avgCost = totalCost / costs.length
  const peakCost = Math.max(...costs)
  const minCost = Math.min(...costs)
  const peakDay = data.find(d => d.cost === peakCost)?.date

  // Calculate trend (percentage change from first to last)
  const firstCost = costs[0] || 0
  const lastCost = costs[costs.length - 1] || 0
  const trend = firstCost > 0 ? ((lastCost - firstCost) / firstCost) * 100 : 0

  return {
    totalCost,
    avgCost,
    peakCost,
    minCost,
    peakDay,
    trend
  }
}
