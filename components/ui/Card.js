'use client'

import { forwardRef } from 'react'

const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'default',
  className = '',
  hover = false,
  clickable = false,
  onClick,
  ...props
}, ref) => {
  const baseClasses = 'bg-white rounded-lg border transition-all duration-200'
  
  const variants = {
    default: 'border-gray-200 shadow-sm',
    elevated: 'border-gray-200 shadow-md',
    outlined: 'border-gray-300 shadow-none',
    ghost: 'border-transparent shadow-none bg-gray-50',
    success: 'border-green-200 shadow-sm bg-green-50',
    warning: 'border-yellow-200 shadow-sm bg-yellow-50',
    error: 'border-red-200 shadow-sm bg-red-50',
    info: 'border-blue-200 shadow-sm bg-blue-50'
  }

  const paddings = {
    none: '',
    sm: 'p-4',
    default: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  }

  const interactiveClasses = hover || clickable ? 'hover:shadow-md hover:-translate-y-0.5' : ''
  const cursorClass = clickable ? 'cursor-pointer' : ''

  return (
    <div
      ref={ref}
      className={`${baseClasses} ${variants[variant]} ${paddings[padding]} ${interactiveClasses} ${cursorClass} ${className}`}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </div>
  )
})

Card.displayName = 'Card'

export default Card

// Card Header Component
export function CardHeader({ children, className = '' }) {
  return (
    <div className={`border-b border-gray-200 pb-4 mb-6 ${className}`}>
      {children}
    </div>
  )
}

// Card Title Component
export function CardTitle({ children, className = '', size = 'default' }) {
  const sizes = {
    sm: 'text-lg font-semibold text-gray-900',
    default: 'text-xl font-semibold text-gray-900',
    lg: 'text-2xl font-bold text-gray-900'
  }

  return (
    <h3 className={`${sizes[size]} ${className}`}>
      {children}
    </h3>
  )
}

// Card Description Component
export function CardDescription({ children, className = '' }) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  )
}

// Card Content Component
export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

// Card Footer Component
export function CardFooter({ children, className = '' }) {
  return (
    <div className={`border-t border-gray-200 pt-4 mt-6 ${className}`}>
      {children}
    </div>
  )
}

// Stat Card - Specialized for metrics display with mobile optimization
export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon: Icon,
  color = 'blue',
  className = '' 
}) {
  const colors = {
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    green: 'text-green-600',
    orange: 'text-orange-600',
    red: 'text-red-600'
  }

  const changeColors = {
    positive: 'text-green-600 bg-green-100',
    negative: 'text-red-600 bg-red-100',
    neutral: 'text-gray-600 bg-gray-100'
  }

  return (
    <Card hover className={`${className}`} padding="sm">
      <div className="flex items-start sm:items-center">
        <div className="flex-shrink-0">
          {Icon && <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${colors[color]}`} />}
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1">
            <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{value}</p>
            {change && (
              <div className="mt-1 sm:mt-0">
                {typeof change === 'string' ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${changeColors[changeType]}`}>
                    {change}
                  </span>
                ) : (
                  change
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}