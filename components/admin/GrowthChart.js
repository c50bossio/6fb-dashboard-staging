'use client'

import { useState, useEffect } from 'react'

export default function GrowthChart({ data, period }) {
  const [chartType, setChartType] = useState('net') // net, new, canceled
  const [hoveredData, setHoveredData] = useState(null)

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Growth</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No growth data available
        </div>
      </div>
    )
  }

  const processedData = data.map(item => ({
    ...item,
    date: new Date(item.date),
    formattedDate: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  const chartWidth = 800
  const chartHeight = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  const getMinMax = (key) => {
    const values = processedData.map(d => d[key])
    return {
      min: Math.min(0, Math.min(...values)),
      max: Math.max(...values)
    }
  }

  const { min, max } = getMinMax(chartType)
  const range = max - min || 1

  const xScale = (index) => (index / (processedData.length - 1)) * innerWidth
  const yScale = (value) => innerHeight - ((value - min) / range) * innerHeight

  const generatePath = (key) => {
    return processedData.map((d, i) => {
      const x = xScale(i)
      const y = yScale(d[key])
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
  }

  const generateAreaPath = (key) => {
    const linePath = generatePath(key)
    const baseline = yScale(0)
    const firstX = xScale(0)
    const lastX = xScale(processedData.length - 1)
    
    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`
  }

  const chartColors = {
    net: { line: '#3B82F6', fill: '#3B82F6', area: '#EBF4FF' },
    new: { line: '#10B981', fill: '#10B981', area: '#D1FAE5' },
    canceled: { line: '#EF4444', fill: '#EF4444', area: '#FEE2E2' }
  }

  const currentColor = chartColors[chartType]

  const totalNew = processedData.reduce((sum, d) => sum + d.new, 0)
  const totalCanceled = processedData.reduce((sum, d) => sum + d.canceled, 0)
  const netGrowth = totalNew - totalCanceled
  const averageDaily = netGrowth / processedData.length

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Subscription Growth ({period})
        </h3>
        
        {/* Chart Type Selector */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setChartType('net')}
            className={`px-3 py-2 text-sm font-medium ${
              chartType === 'net' 
                ? 'bg-olive-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Net Growth
          </button>
          <button
            onClick={() => setChartType('new')}
            className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${
              chartType === 'new' 
                ? 'bg-moss-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            New Signups
          </button>
          <button
            onClick={() => setChartType('canceled')}
            className={`px-3 py-2 text-sm font-medium border-l border-gray-300 ${
              chartType === 'canceled' 
                ? 'bg-red-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancellations
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total New</div>
          <div className="text-2xl font-bold text-green-600">+{totalNew}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Total Canceled</div>
          <div className="text-2xl font-bold text-red-600">-{totalCanceled}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Net Growth</div>
          <div className={`text-2xl font-bold ${netGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netGrowth >= 0 ? '+' : ''}{netGrowth}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600">Avg Daily</div>
          <div className={`text-2xl font-bold ${averageDaily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {averageDaily >= 0 ? '+' : ''}{averageDaily.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="w-full h-auto"
          style={{ maxWidth: '100%' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={innerWidth} height={innerHeight} x={padding.left} y={padding.top} fill="url(#grid)" />

          {/* Zero line */}
          {min < 0 && (
            <line
              x1={padding.left}
              x2={padding.left + innerWidth}
              y1={padding.top + yScale(0)}
              y2={padding.top + yScale(0)}
              stroke="#6B7280"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )}

          {/* Area fill */}
          <path
            d={generateAreaPath(chartType)}
            fill={currentColor.area}
            opacity="0.3"
            transform={`translate(${padding.left}, ${padding.top})`}
          />

          {/* Line */}
          <path
            d={generatePath(chartType)}
            fill="none"
            stroke={currentColor.line}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform={`translate(${padding.left}, ${padding.top})`}
          />

          {/* Data points */}
          {processedData.map((d, i) => (
            <circle
              key={i}
              cx={padding.left + xScale(i)}
              cy={padding.top + yScale(d[chartType])}
              r="4"
              fill={currentColor.fill}
              className="cursor-pointer hover:r-6"
              onMouseEnter={() => setHoveredData({ ...d, index: i })}
              onMouseLeave={() => setHoveredData(null)}
            />
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            x2={padding.left + innerWidth}
            y1={padding.top + innerHeight}
            y2={padding.top + innerHeight}
            stroke="#6B7280"
            strokeWidth="1"
          />

          {/* Y-axis */}
          <line
            x1={padding.left}
            x2={padding.left}
            y1={padding.top}
            y2={padding.top + innerHeight}
            stroke="#6B7280"
            strokeWidth="1"
          />

          {/* X-axis labels */}
          {processedData.map((d, i) => {
            if (i % Math.ceil(processedData.length / 8) === 0 || i === processedData.length - 1) {
              return (
                <text
                  key={i}
                  x={padding.left + xScale(i)}
                  y={padding.top + innerHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {d.formattedDate}
                </text>
              )
            }
            return null
          })}

          {/* Y-axis labels */}
          {Array.from({ length: 5 }, (_, i) => {
            const value = min + (range / 4) * i
            const y = padding.top + yScale(value)
            return (
              <text
                key={i}
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-600"
              >
                {Math.round(value)}
              </text>
            )
          })}
        </svg>

        {/* Tooltip */}
        {hoveredData && (
          <div 
            className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg text-sm pointer-events-none z-10"
            style={{
              left: padding.left + xScale(hoveredData.index) - 50,
              top: padding.top + yScale(hoveredData[chartType]) - 60
            }}
          >
            <div className="font-medium">{hoveredData.formattedDate}</div>
            <div className="space-y-1">
              <div>New: +{hoveredData.new}</div>
              <div>Canceled: -{hoveredData.canceled}</div>
              <div className="font-medium">Net: {hoveredData.net >= 0 ? '+' : ''}{hoveredData.net}</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center mt-4 space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">New Subscriptions</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <span className="text-gray-600">Cancellations</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-olive-500 rounded-full"></div>
          <span className="text-gray-600">Net Growth</span>
        </div>
      </div>
    </div>
  )
}