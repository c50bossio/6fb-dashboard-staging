'use client'

import { useState } from 'react'
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

/**
 * LocationComparisonGrid Component
 *
 * Sortable table displaying all locations with performance metrics
 *
 * Props:
 * - locations: Array of location objects with metrics
 * - onSort: Callback when sort changes
 * - sortField: Current sort field
 * - sortDirection: Current sort direction ('asc' or 'desc')
 * - loading: Boolean indicating loading state
 */
export default function LocationComparisonGrid({
  locations = [],
  onSort,
  sortField = 'revenue',
  sortDirection = 'desc',
  loading = false
}) {
  const router = useRouter()
  const [localSortField, setLocalSortField] = useState(sortField)
  const [localSortDirection, setLocalSortDirection] = useState(sortDirection)

  const handleSort = (field) => {
    let newDirection = 'desc'
    if (localSortField === field) {
      newDirection = localSortDirection === 'desc' ? 'asc' : 'desc'
    }
    setLocalSortField(field)
    setLocalSortDirection(newDirection)
    onSort?.(field, newDirection)
  }

  // Sort locations locally if no external onSort handler
  const sortedLocations = [...locations].sort((a, b) => {
    const field = localSortField
    const direction = localSortDirection === 'asc' ? 1 : -1

    if (typeof a[field] === 'number' && typeof b[field] === 'number') {
      return (a[field] - b[field]) * direction
    }
    return String(a[field]).localeCompare(String(b[field])) * direction
  })

  const columns = [
    { key: 'name', label: 'Location', sortable: true },
    { key: 'city', label: 'City', sortable: true },
    { key: 'revenue', label: 'Revenue', sortable: true, format: 'currency' },
    { key: 'bookings', label: 'Bookings', sortable: true },
    { key: 'satisfaction', label: 'Satisfaction', sortable: true, format: 'decimal' },
    { key: 'utilization', label: 'Utilization', sortable: true, format: 'percentage' },
    { key: 'trend', label: 'Trend', sortable: false }
  ]

  const formatValue = (value, format) => {
    if (value === null || value === undefined) return '-'

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value)
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`
      case 'decimal':
        return value.toFixed(2)
      default:
        return value
    }
  }

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'down':
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <MinusIcon className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getPerformanceIndicator = (index, total) => {
    if (total <= 1) return null
    if (index === 0) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">Top</span>
    }
    if (index === total - 1) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200">Bottom</span>
    }
    return null
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="px-6 py-3">
                    <div className="h-4 bg-muted rounded w-20 animate-pulse"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[1, 2, 3, 4, 5].map((index) => (
                <tr key={index}>
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-12">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No locations found</p>
          <p className="text-sm text-muted-foreground">
            Add locations to your organization to see performance data
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Location Performance Comparison</h3>
        <p className="text-sm text-muted-foreground mt-1">Click column headers to sort</p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:bg-muted/80 select-none' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && localSortField === column.key && (
                      localSortDirection === 'desc' ? (
                        <ChevronDownIcon className="h-4 w-4" />
                      ) : (
                        <ChevronUpIcon className="h-4 w-4" />
                      )
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {sortedLocations.map((location, index) => (
              <tr
                key={location.id}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => router.push(`/dashboard?location=${location.id}`)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{location.name}</span>
                    {getPerformanceIndicator(index, sortedLocations.length)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                  {location.city}, {location.state}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-foreground">
                  {formatValue(location.revenue, 'currency')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatValue(location.bookings)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatValue(location.satisfaction, 'decimal')} / 5.0
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {formatValue(location.utilization, 'percentage')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getTrendIcon(location.trend)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
