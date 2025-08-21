/**
 * Customer Data Visualizations Component
 * 
 * Provides beautiful, interactive charts and visualizations for customer insights
 * Uses CSS and SVG for lightweight, performance-optimized data visualization
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  ChartBarIcon,
  ChartPieIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  StarIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { customerDesignTokens } from './CustomerDesignSystem'
import { AnimatedContainer, CountUp, useInViewAnimation } from '../../utils/animations'
import { HoverCard, Tooltip } from './CustomerMicroInteractions'

/**
 * Animated bar chart component
 */
export function AnimatedBarChart({
  data = [],
  title = 'Chart',
  xAxisLabel = 'Category',
  yAxisLabel = 'Value',
  color = 'olive',
  height = 300,
  showValues = true,
  className = ''
}) {
  const [animationRef, isInView] = useInViewAnimation()
  const [hoveredBar, setHoveredBar] = useState(null)

  const colors = {
    olive: '#8ba362',
    moss: '#7a9458',
    gold: '#e5c55c',
    green: '#22c55e',
    blue: '#3b82f6',
    purple: '#8b5cf6'
  }

  const maxValue = Math.max(...data.map(d => d.value))
  const chartHeight = height - 60 // Reserve space for labels

  return (
    <div ref={animationRef} className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
        <ChartBarIcon className="h-5 w-5 mr-2 text-olive-600" />
        {title}
      </h3>

      <div className="relative" style={{ height: height }}>
        {/* Chart area */}
        <svg
          width="100%"
          height={chartHeight}
          className="overflow-visible"
        >
          {/* Background grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <line
              key={percent}
              x1="0"
              y1={chartHeight - (chartHeight * percent / 100)}
              x2="100%"
              y2={chartHeight - (chartHeight * percent / 100)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Bars */}
          {data.map((item, index) => {
            const barWidth = `${80 / data.length}%`
            const barHeight = isInView ? (item.value / maxValue) * chartHeight : 0
            const x = `${(index * 100 / data.length) + (10 / data.length)}%`
            const y = chartHeight - barHeight

            return (
              <g key={index}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colors[color]}
                  opacity={hoveredBar === index ? 0.8 : 0.7}
                  rx="4"
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={() => setHoveredBar(index)}
                  onMouseLeave={() => setHoveredBar(null)}
                  style={{
                    transitionDelay: `${index * 100}ms`
                  }}
                />

                {/* Value label */}
                {showValues && isInView && (
                  <text
                    x={`${(index * 100 / data.length) + (50 / data.length)}%`}
                    y={y - 8}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-700"
                  >
                    {item.value}
                  </text>
                )}

                {/* Category label */}
                <text
                  x={`${(index * 100 / data.length) + (50 / data.length)}%`}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {item.label}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 -ml-8">
          {[maxValue, Math.round(maxValue * 0.75), Math.round(maxValue * 0.5), Math.round(maxValue * 0.25), 0].map((value, index) => (
            <span key={index} className="leading-none">
              {value}
            </span>
          ))}
        </div>
      </div>

      {/* Axis labels */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-600">
        <span>{xAxisLabel}</span>
        <span className="text-right">{yAxisLabel}</span>
      </div>
    </div>
  )
}

/**
 * Animated donut chart component
 */
export function AnimatedDonutChart({
  data = [],
  title = 'Distribution',
  showLegend = true,
  size = 200,
  thickness = 30,
  className = ''
}) {
  const [animationRef, isInView] = useInViewAnimation()
  const [hoveredSegment, setHoveredSegment] = useState(null)

  const colors = ['#8ba362', '#7a9458', '#e5c55c', '#22c55e', '#3b82f6', '#8b5cf6', '#ef4444']
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const center = size / 2
  const radius = (size - thickness) / 2

  let currentAngle = -90 // Start from top

  return (
    <div ref={animationRef} className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
        <ChartPieIcon className="h-5 w-5 mr-2 text-olive-600" />
        {title}
      </h3>

      <div className="flex items-center justify-center space-x-8">
        {/* Chart */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {data.map((item, index) => {
              const percentage = (item.value / total) * 100
              const angle = (item.value / total) * 360
              const strokeDasharray = `${percentage * 3.14159 * radius / 50} ${314159}`
              const strokeDashoffset = isInView ? 0 : 314159

              const segment = (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth={thickness}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  opacity={hoveredSegment === index ? 1 : 0.8}
                  className="transition-all duration-1000 ease-out cursor-pointer"
                  style={{
                    transform: `rotate(${currentAngle}deg)`,
                    transformOrigin: `${center}px ${center}px`,
                    transitionDelay: `${index * 200}ms`
                  }}
                  onMouseEnter={() => setHoveredSegment(index)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              )

              currentAngle += angle
              return segment
            })}
          </svg>

          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-2xl font-bold text-gray-900">
              <CountUp end={total} duration={1000} />
            </div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="space-y-3">
            {data.map((item, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 cursor-pointer"
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">
                    {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Customer trends line chart
 */
export function CustomerTrendsChart({
  data = [],
  title = 'Customer Trends',
  timeframe = '7d',
  onTimeframeChange,
  className = ''
}) {
  const [animationRef, isInView] = useInViewAnimation()
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const height = 200
  const width = 400
  const padding = 40

  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const valueRange = maxValue - minValue

  // Generate SVG path
  const pathData = data.map((point, index) => {
    const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
    const y = height - padding - ((point.value - minValue) / valueRange) * (height - 2 * padding)
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')

  return (
    <div ref={animationRef} className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 flex items-center">
          <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-olive-600" />
          {title}
        </h3>
        
        {onTimeframeChange && (
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {['7d', '30d', '90d'].map(period => (
              <button
                key={period}
                onClick={() => onTimeframeChange(period)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeframe === period
                    ? 'bg-white text-olive-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(percent => (
            <line
              key={percent}
              x1={padding}
              y1={height - padding - ((height - 2 * padding) * percent / 100)}
              x2={width - padding}
              y2={height - padding - ((height - 2 * padding) * percent / 100)}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Gradient fill */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8ba362" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8ba362" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          {isInView && (
            <path
              d={`${pathData} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
              fill="url(#chartGradient)"
              className="animate-in fade-in-0"
              style={{ animationDuration: '1s' }}
            />
          )}

          {/* Line */}
          {isInView && (
            <path
              d={pathData}
              stroke="#8ba362"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-in fade-in-0"
              style={{
                strokeDasharray: '1000',
                strokeDashoffset: '1000',
                animation: 'line-draw 1.5s ease-out forwards',
                animationDelay: '0.5s'
              }}
            />
          )}

          {/* Data points */}
          {data.map((point, index) => {
            const x = padding + (index * (width - 2 * padding)) / (data.length - 1)
            const y = height - padding - ((point.value - minValue) / valueRange) * (height - 2 * padding)

            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r={hoveredPoint === index ? 6 : 4}
                fill="#8ba362"
                stroke="white"
                strokeWidth="2"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredPoint(index)}
                onMouseLeave={() => setHoveredPoint(null)}
                style={{
                  opacity: isInView ? 1 : 0,
                  transform: hoveredPoint === index ? 'scale(1.2)' : 'scale(1)',
                  transitionDelay: `${index * 100 + 1000}ms`
                }}
              />
            )
          })}

          {/* Hover tooltip */}
          {hoveredPoint !== null && (
            <g>
              <rect
                x={padding + (hoveredPoint * (width - 2 * padding)) / (data.length - 1) - 25}
                y={height - padding - ((data[hoveredPoint].value - minValue) / valueRange) * (height - 2 * padding) - 35}
                width="50"
                height="25"
                fill="rgba(0,0,0,0.8)"
                rx="4"
              />
              <text
                x={padding + (hoveredPoint * (width - 2 * padding)) / (data.length - 1)}
                y={height - padding - ((data[hoveredPoint].value - minValue) / valueRange) * (height - 2 * padding) - 20}
                textAnchor="middle"
                className="text-xs fill-white font-medium"
              >
                {data[hoveredPoint].value}
              </text>
            </g>
          )}
        </svg>
      </div>

      <style jsx>{`
        @keyframes line-draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Customer metrics dashboard
 */
export function CustomerMetricsDashboard({
  customers = [],
  onRefresh,
  className = ''
}) {
  const [refreshing, setRefreshing] = useState(false)

  // Calculate metrics
  const totalCustomers = customers.length
  const vipCustomers = customers.filter(c => c.segment === 'vip').length
  const newCustomers = customers.filter(c => c.segment === 'new').length
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  const avgSpendPerCustomer = totalCustomers > 0 ? totalRevenue / totalCustomers : 0

  // Segment distribution for donut chart
  const segmentData = [
    { label: 'VIP', value: customers.filter(c => c.segment === 'vip').length },
    { label: 'Regular', value: customers.filter(c => c.segment === 'regular').length },
    { label: 'New', value: customers.filter(c => c.segment === 'new').length },
    { label: 'Lapsed', value: customers.filter(c => c.segment === 'lapsed').length }
  ].filter(item => item.value > 0)

  // Monthly revenue trend (mock data)
  const revenueData = [
    { label: 'Jan', value: 12500 },
    { label: 'Feb', value: 13200 },
    { label: 'Mar', value: 11800 },
    { label: 'Apr', value: 14500 },
    { label: 'May', value: 15200 },
    { label: 'Jun', value: 16800 }
  ]

  // Customer growth trend (mock data)
  const growthData = [
    { label: 'W1', value: 23 },
    { label: 'W2', value: 27 },
    { label: 'W3', value: 31 },
    { label: 'W4', value: 29 },
    { label: 'W5', value: 35 },
    { label: 'W6', value: 38 }
  ]

  const handleRefresh = async () => {
    setRefreshing(true)
    await onRefresh?.()
    setTimeout(() => setRefreshing(false), 1000)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Analytics</h2>
          <p className="text-gray-600">Insights and trends from your customer data</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={totalCustomers}
          icon={UserGroupIcon}
          color="blue"
          trend={+12}
        />
        <MetricCard
          title="VIP Customers"
          value={vipCustomers}
          icon={StarIcon}
          color="gold"
          trend={+8}
        />
        <MetricCard
          title="New This Month"
          value={newCustomers}
          icon={ArrowTrendingUpIcon}
          color="green"
          trend={+15}
        />
        <MetricCard
          title="Avg Spend"
          value={avgSpendPerCustomer}
          icon={CurrencyDollarIcon}
          color="purple"
          trend={-3}
          prefix="$"
          decimals={0}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Segments */}
        <AnimatedDonutChart
          data={segmentData}
          title="Customer Segments"
          showLegend={true}
        />

        {/* Revenue Trend */}
        <AnimatedBarChart
          data={revenueData}
          title="Monthly Revenue"
          xAxisLabel="Month"
          yAxisLabel="Revenue ($)"
          color="green"
          showValues={true}
        />
      </div>

      {/* Growth Trend */}
      <CustomerTrendsChart
        data={growthData}
        title="Customer Growth"
        timeframe="30d"
      />
    </div>
  )
}

/**
 * Individual metric card component
 */
function MetricCard({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend = null,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) {
  const colors = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    gold: { bg: 'bg-yellow-100', text: 'text-yellow-600' }
  }

  const colorClasses = colors[color] || colors.blue

  return (
    <HoverCard className={`bg-white rounded-xl border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}
            <CountUp end={value} decimals={decimals} duration={1000} />
            {suffix}
          </p>
          {trend !== null && (
            <div className={`flex items-center mt-2 text-sm ${
              trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span>{Math.abs(trend)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 ${colorClasses.bg} rounded-lg`}>
          <Icon className={`h-6 w-6 ${colorClasses.text}`} />
        </div>
      </div>
    </HoverCard>
  )
}

export default {
  AnimatedBarChart,
  AnimatedDonutChart,
  CustomerTrendsChart,
  CustomerMetricsDashboard,
  MetricCard
}