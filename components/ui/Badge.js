'use client'

import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100',
        primary: 'border-transparent bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
        success: 'border-transparent bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-100',
        warning: 'border-transparent bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-100',
        error: 'border-transparent bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-100',
        outline: 'text-gray-950 dark:text-gray-50 border-gray-200 dark:border-gray-700',
        'outline-primary': 'text-brand-600 border-brand-200 dark:text-brand-400 dark:border-brand-800',
        'outline-success': 'text-success-600 border-success-200 dark:text-success-400 dark:border-success-800',
        'outline-warning': 'text-warning-600 border-warning-200 dark:text-warning-400 dark:border-warning-800',
        'outline-error': 'text-error-600 border-error-200 dark:text-error-400 dark:border-error-800'
      },
      size: {
        sm: 'px-2 py-0.5 text-2xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

const Badge = ({ 
  className, 
  variant, 
  size, 
  children, 
  ...props 
}) => (
  <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
    {children}
  </div>
)

// Status badge with dot indicator
const StatusBadge = ({ 
  status, 
  className, 
  showDot = true, 
  size = 'md',
  ...props 
}) => {
  const getStatusVariant = (status) => {
    const statusMap = {
      active: 'success',
      inactive: 'secondary',
      pending: 'warning',
      error: 'error',
      success: 'success',
      warning: 'warning',
      danger: 'error',
      connected: 'success',
      disconnected: 'error',
      syncing: 'primary',
      online: 'success',
      offline: 'secondary',
      busy: 'warning',
      away: 'warning'
    }
    return statusMap[status?.toLowerCase()] || 'secondary'
  }

  const getDotColor = (status) => {
    const colorMap = {
      active: 'bg-success-500',
      inactive: 'bg-gray-400',
      pending: 'bg-warning-500',
      error: 'bg-error-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-error-500',
      connected: 'bg-success-500',
      disconnected: 'bg-error-500',
      syncing: 'bg-brand-500',
      online: 'bg-success-500',
      offline: 'bg-gray-400',
      busy: 'bg-warning-500',
      away: 'bg-warning-500'
    }
    return colorMap[status?.toLowerCase()] || 'bg-gray-400'
  }

  return (
    <Badge 
      variant={getStatusVariant(status)} 
      size={size}
      className={cn('capitalize', className)} 
      {...props}
    >
      {showDot && (
        <div className={cn(
          'w-2 h-2 rounded-full mr-1.5',
          getDotColor(status)
        )} />
      )}
      {status}
    </Badge>
  )
}

// Count badge (typically used for notifications)
const CountBadge = ({ 
  count, 
  max = 99, 
  className, 
  variant = 'error',
  size = 'sm',
  ...props 
}) => {
  if (!count || count <= 0) return null

  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <Badge 
      variant={variant} 
      size={size}
      className={cn('tabular-nums', className)} 
      {...props}
    >
      {displayCount}
    </Badge>
  )
}

// Removable badge with X button
const RemovableBadge = ({ 
  children, 
  onRemove, 
  className, 
  variant = 'default',
  size = 'md',
  ...props 
}) => (
  <Badge 
    variant={variant} 
    size={size}
    className={cn('pr-1 gap-1', className)} 
    {...props}
  >
    {children}
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    )}
  </Badge>
)

export { Badge, StatusBadge, CountBadge, RemovableBadge, badgeVariants }