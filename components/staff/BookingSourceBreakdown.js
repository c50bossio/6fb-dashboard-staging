'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

/**
 * Booking Source Breakdown
 * Displays pie chart showing bookings by source (staff_link, admin, walk_in)
 */
export default function BookingSourceBreakdown({ sourceBreakdown }) {
  // Transform data for Recharts
  const data = [
    {
      name: 'Booking Link',
      value: sourceBreakdown?.staff_link?.count || 0,
      revenue: sourceBreakdown?.staff_link?.revenue || 0,
      color: '#6B7C3F', // Olive green
      description: 'From personal booking page',
    },
    {
      name: 'Admin Created',
      value: sourceBreakdown?.admin?.count || 0,
      revenue: sourceBreakdown?.admin?.revenue || 0,
      color: '#3B82F6', // Blue
      description: 'Created via dashboard',
    },
    {
      name: 'Walk-in',
      value: sourceBreakdown?.walk_in?.count || 0,
      revenue: sourceBreakdown?.walk_in?.revenue || 0,
      color: '#F59E0B', // Yellow
      description: 'Walk-in customer',
    },
  ].filter((item) => item.value > 0) // Only show sources with bookings

  const totalBookings = data.reduce((sum, item) => sum + item.value, 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = ((data.value / totalBookings) * 100).toFixed(1)

      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-xs text-gray-600 mt-1">{data.description}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{data.value}</span> bookings ({percentage}%)
            </p>
            <p className="text-sm text-gray-700">
              <span className="font-medium">${data.revenue.toFixed(2)}</span> revenue
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const renderLegend = (props) => {
    const { payload } = props
    return (
      <div className="flex flex-col space-y-2 mt-4">
        {payload.map((entry, index) => {
          const percentage = ((entry.payload.value / totalBookings) * 100).toFixed(1)
          return (
            <div key={`legend-${index}`} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-700">{entry.value}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium text-gray-900">
                  {entry.payload.value} ({percentage}%)
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (totalBookings === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-sm text-gray-600 italic">No bookings yet</p>
      </div>
    )
  }

  return (
    <div>
      {/* Pie Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-4">
        {data.map((item, index) => {
          const percentage = ((item.value / totalBookings) * 100).toFixed(1)
          return (
            <div
              key={`stat-${index}`}
              className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {item.value} ({percentage}%)
                </p>
                <p className="text-xs text-gray-600">${item.revenue.toFixed(2)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total</span>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">{totalBookings} bookings</p>
            <p className="text-xs text-gray-600">
              ${data.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)} revenue
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
