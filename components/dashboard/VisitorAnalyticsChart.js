'use client'

import { useState, useMemo } from 'react'
import { DevicePhoneMobileIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline'

export default function VisitorAnalyticsChart({ dateRange, onDateRangeChange }) {
  const [selectedRange, setSelectedRange] = useState(dateRange || '3months')
  const [hoveredDay, setHoveredDay] = useState(null)

  // Generate mock data based on date range
  const chartData = useMemo(() => {
    const days = selectedRange === '7days' ? 7 : selectedRange === '30days' ? 30 : 90
    const data = []
    const now = new Date()
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      
      // Generate realistic visitor patterns
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const baseVisitors = isWeekend ? 150 : 250
      const variation = Math.random() * 100 - 50
      const mobileVisitors = Math.floor((baseVisitors + variation) * 0.6)
      const desktopVisitors = Math.floor((baseVisitors + variation) * 0.4)
      
      data.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mobile: mobileVisitors,
        desktop: desktopVisitors,
        total: mobileVisitors + desktopVisitors
      })
    }
    
    return data
  }, [selectedRange])

  const maxValue = Math.max(...chartData.map(d => d.total))
  const chartHeight = 300

  const handleRangeChange = (_range) => {
    setSelectedRange(range)
    if (onDateRangeChange) {
      onDateRangeChange(range)
    }
  }

  // Calculate current totals
  const totals = useMemo(() => {
    const mobile = chartData.reduce((sum, day) => sum + day.mobile, 0)
    const desktop = chartData.reduce((sum, day) => sum + day.desktop, 0)
    return { mobile, desktop, total: mobile + desktop }
  }, [chartData])

  return (
    <div className="bg-white/5 dark:bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-200/10 dark:border-gray-700/30">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Total Visitors</h3>
          <p className="text-sm text-gray-400">Total for the last {selectedRange === '3months' ? '3 months' : selectedRange === '30days' ? '30 days' : '7 days'}</p>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleRangeChange('3months')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedRange === '3months'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Last 3 months
          </button>
          <button
            onClick={() => handleRangeChange('30days')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedRange === '30days'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Last 30 days
          </button>
          <button
            onClick={() => handleRangeChange('7days')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedRange === '7days'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Last 7 days
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative" style={{ height: `${chartHeight}px` }}>
        {/* SVG Chart */}
        <svg className="w-full h-full">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          
          {/* Area Path */}
          <path
            d={`
              M 0 ${chartHeight}
              ${chartData.map((day, index) => {
                const x = (index / (chartData.length - 1)) * 100
                const y = chartHeight - (day.total / maxValue) * chartHeight * 0.8
                return `L ${x}% ${y}`
              }).join(' ')}
              L 100% ${chartHeight}
              Z
            `}
            fill="url(#areaGradient)"
            className="transition-all duration-300"
          />
          
          {/* Line Path */}
          <path
            d={`
              M 0 ${chartHeight - (chartData[0].total / maxValue) * chartHeight * 0.8}
              ${chartData.slice(1).map((day, index) => {
                const x = ((index + 1) / (chartData.length - 1)) * 100
                const y = chartHeight - (day.total / maxValue) * chartHeight * 0.8
                return `L ${x}% ${y}`
              }).join(' ')}
            `}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          
          {/* Hover Points */}
          {chartData.map((day, index) => {
            const x = (index / (chartData.length - 1)) * 100
            const y = chartHeight - (day.total / maxValue) * chartHeight * 0.8
            return (
              <g key={index}>
                <circle
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill="#3B82F6"
                  className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                  onMouseEnter={() => setHoveredDay(index)}
                  onMouseLeave={() => setHoveredDay(null)}
                />
                {hoveredDay === index && (
                  <g>
                    <rect
                      x={`${x - 5}%`}
                      y={y - 40}
                      width="80"
                      height="30"
                      fill="#1F2937"
                      rx="4"
                      className="opacity-95"
                    />
                    <text
                      x={`${x}%`}
                      y={y - 20}
                      textAnchor="middle"
                      fill="white"
                      fontSize="12"
                      fontWeight="600"
                    >
                      {day.total} visitors
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-400 mt-2">
          {chartData.filter((_, i) => i % Math.ceil(chartData.length / 6) === 0).map((day, index) => (
            <span key={index}>{day.label}</span>
          ))}
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <DevicePhoneMobileIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Mobile</p>
              <p className="text-xl font-bold text-white">{totals.mobile.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <ComputerDesktopIcon className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Desktop</p>
              <p className="text-xl font-bold text-white">{totals.desktop.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}