'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useState } from 'react'

/**
 * PerformanceChart Component
 *
 * Displays revenue trends over time using Recharts
 * Multi-line chart comparing top locations
 *
 * Props:
 * - data: Array of data points with date and location revenues
 * - dateRange: Current date range ('7days', '30days', '90days')
 * - onDateRangeChange: Callback when date range changes
 * - loading: Boolean indicating loading state
 */
export default function PerformanceChart({
  data = [],
  dateRange = '30days',
  onDateRangeChange,
  loading = false
}) {
  const dateRangeOptions = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: '90days', label: '90 Days' }
  ]

  // Custom tooltip for better UX
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-4">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-xs text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-semibold" style={{ color: entry.color }}>
                ${entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="h-80 bg-muted rounded animate-pulse"></div>
      </div>
    )
  }

  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Revenue Trends</h3>
          <div className="flex gap-2">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onDateRangeChange?.(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateRange === option.value
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No performance data available</p>
            <p className="text-sm text-muted-foreground">
              Data will appear here once locations record revenue
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Extract location names from data for dynamic line generation
  const locationKeys = data.length > 0
    ? Object.keys(data[0]).filter(key => key !== 'date')
    : []

  // Color palette for locations
  const colors = [
    '#f59e0b', // amber-500
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#ef4444', // red-500
    '#8b5cf6', // purple-500
    '#ec4899', // pink-500
    '#14b8a6', // teal-500
  ]

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-lg font-semibold text-foreground">Revenue Trends</h3>
        <div className="flex gap-2">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onDateRangeChange?.(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === option.value
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '14px' }}
            iconType="line"
          />
          {locationKeys.map((locationKey, index) => (
            <Line
              key={locationKey}
              type="monotone"
              dataKey={locationKey}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={locationKey}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
