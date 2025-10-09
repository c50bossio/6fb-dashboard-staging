'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'

const AGENT_COLORS = {
  'financial_coach_agent': '#10B981',
  'booking_intelligence_agent': '#3B82F6',
  'operations_agent': '#F59E0B',
  'marketing_agent': '#8B5CF6',
  'client_acquisition_agent': '#EC4899',
  'brand_agent': '#14B8A6',
  'growth_agent': '#EF4444',
  'master_triage_agent': '#6B7280'
}

export default function AgentUsageChart({ data, onAgentClick }) {
  const [selectedAgent, setSelectedAgent] = useState(null)

  // Format data for Recharts
  const chartData = data.map(item => ({
    agent: cleanAgentName(item.agent),
    agentId: item.agent,
    queries: item.count,
    fill: AGENT_COLORS[item.agent] || '#C5A35B'
  }))

  const handleBarClick = (data) => {
    setSelectedAgent(data.agentId)
    if (onAgentClick) {
      onAgentClick(data.agentId)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Agent Usage Distribution</h2>
        <p className="text-sm text-gray-600 mt-1">
          Queries handled by each AI agent
          {selectedAgent && (
            <span className="ml-2 text-olive-600 font-medium">
              (Filtered: {cleanAgentName(selectedAgent)})
            </span>
          )}
        </p>
      </div>

      <div className="p-6">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="agent"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6B7280' }}
              label={{ value: 'Number of Queries', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#6B7280' } }}
            />
            <Tooltip
              cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              content={<CustomTooltip />}
            />
            <Bar
              dataKey="queries"
              radius={[8, 8, 0, 0]}
              onClick={handleBarClick}
              className="cursor-pointer"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  opacity={selectedAgent && selectedAgent !== entry.agentId ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          {chartData.map((item, index) => (
            <button
              key={index}
              onClick={() => handleBarClick(item)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                selectedAgent === item.agentId
                  ? 'bg-olive-50 ring-2 ring-olive-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm font-medium text-gray-700">{item.agent}</span>
              <span className="text-xs text-gray-500">({item.queries})</span>
            </button>
          ))}
        </div>

        {selectedAgent && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setSelectedAgent(null)
                if (onAgentClick) onAgentClick(null)
              }}
              className="text-sm text-olive-600 hover:text-olive-700 font-medium"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Custom tooltip component
function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-900 mb-2">{data.agent}</p>
      <div className="space-y-1 text-sm">
        <div className="flex items-center justify-between space-x-4">
          <span className="text-gray-600">Queries:</span>
          <span className="font-medium text-gray-900">{data.queries}</span>
        </div>
      </div>
    </div>
  )
}

// Utility: Clean agent name for display
function cleanAgentName(name) {
  if (!name) return 'Unknown'

  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Agent', '')
    .trim()
}
