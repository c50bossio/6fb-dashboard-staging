'use client'

import {
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
  StarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

/**
 * SummaryCards Component
 *
 * Displays KPI summary cards for enterprise dashboard:
 * - Total Revenue
 * - Total Locations (with active/inactive breakdown)
 * - Average Customer Satisfaction
 * - Average Capacity Utilization
 *
 * Props:
 * - revenue: Total revenue across all locations
 * - locations: Object with totalLocations, activeLocations, inactiveLocations
 * - satisfaction: Average satisfaction score (0-5)
 * - utilization: Average capacity utilization (0-1)
 * - loading: Boolean indicating loading state
 */
export default function SummaryCards({
  revenue = 0,
  locations = { totalLocations: 0, activeLocations: 0, inactiveLocations: 0 },
  satisfaction = 0,
  utilization = 0,
  loading = false
}) {
  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`
  }

  // Format satisfaction score
  const formatSatisfaction = (value) => {
    return `${value.toFixed(2)} / 5.0`
  }

  const cards = [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: formatCurrency(revenue),
      subtitle: 'Last 30 days',
      icon: CurrencyDollarIcon,
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'locations',
      title: 'Total Locations',
      value: locations.totalLocations,
      subtitle: `${locations.activeLocations} active, ${locations.inactiveLocations} inactive`,
      icon: BuildingStorefrontIcon,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'satisfaction',
      title: 'Avg Satisfaction',
      value: formatSatisfaction(satisfaction),
      subtitle: 'Customer rating',
      icon: StarIcon,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      id: 'utilization',
      title: 'Avg Utilization',
      value: formatPercentage(utilization),
      subtitle: 'Capacity used',
      icon: ChartBarIcon,
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400'
    }
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className="bg-card rounded-lg border border-border p-6 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-2"></div>
                <div className="h-8 bg-muted rounded w-32 mb-2"></div>
                <div className="h-3 bg-muted rounded w-20"></div>
              </div>
              <div className="w-12 h-12 bg-muted rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon

        return (
          <div
            key={card.id}
            className="bg-card rounded-lg border border-border p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-foreground mb-1">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              </div>
              <div className={`w-12 h-12 ${card.iconBg} rounded-lg flex items-center justify-center flex-shrink-0 ml-4`}>
                <Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
