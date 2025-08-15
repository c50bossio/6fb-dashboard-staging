'use client'

/**
 * Standardized Card component for consistent layouts across the dashboard
 * Replaces scattered .card class usage with a reusable component
 */
export function Card({ children, className = '', padding = 'default', hover = false, onClick }) {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8'
  }

  const baseClasses = 'bg-white rounded-lg border border-gray-200 shadow-sm'
  const hoverClasses = hover ? 'hover:shadow-lg transition-shadow duration-200' : ''
  const clickableClasses = onClick ? 'cursor-pointer' : ''

  return (
    <div 
      className={`${baseClasses} ${paddingClasses[padding]} ${hoverClasses} ${clickableClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

/**
 * Specialized StatsCard for metrics display
 */
export function StatsCard({ title, value, description, icon: Icon, change, trend, color = 'blue' }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    olive: 'bg-olive-100 text-olive-600',
    amber: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600'
  }

  const trendColors = {
    up: 'text-red-600',
    down: 'text-green-600',
    neutral: 'text-gray-600'
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change && (
              <span className={`ml-2 text-sm ${trendColors[trend] || 'text-gray-600'}`}>
                {change}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
        {Icon && (
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>
    </Card>
  )
}

/**
 * Card with header section
 */
export function CardWithHeader({ title, description, action, children, className = '' }) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Card>
  )
}