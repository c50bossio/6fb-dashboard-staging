'use client'

import { cn } from '../../lib/utils'

// Spinner component
const Spinner = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-brand-500',
        sizeClasses[size],
        className
      )}
    />
  )
}

// Loading dots component
const LoadingDots = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3'
  }

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-brand-500 rounded-full animate-bounce',
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  )
}

// Skeleton components
const Skeleton = ({ className, ...props }) => (
  <div
    className={cn(
      'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
      className
    )}
    {...props}
  />
)

const SkeletonText = ({ lines = 3, className }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-4',
          i === lines - 1 ? 'w-3/4' : 'w-full'
        )}
      />
    ))}
  </div>
)

const SkeletonCard = ({ className }) => (
  <div className={cn('p-6 space-y-4', className)}>
    <div className="flex items-center space-x-4">
      <Skeleton className="w-12 h-12 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
)

// Loading overlay
const LoadingOverlay = ({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className,
  spinnerSize = 'lg' 
}) => (
  <div className={cn('relative', className)}>
    {children}
    {isLoading && (
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          <Spinner size={spinnerSize} />
          {message && (
            <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
              {message}
            </p>
          )}
        </div>
      </div>
    )}
  </div>
)

// Page loading component
const PageLoading = ({ message = 'Loading page...', className }) => (
  <div className={cn('flex items-center justify-center min-h-screen', className)}>
    <div className="flex flex-col items-center space-y-4">
      <Spinner size="xl" />
      <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
        {message}
      </p>
    </div>
  </div>
)

// Inline loading component
const InlineLoading = ({ 
  message = 'Loading...', 
  size = 'sm', 
  className 
}) => (
  <div className={cn('flex items-center space-x-2', className)}>
    <Spinner size={size} />
    <span className="text-sm text-gray-600 dark:text-gray-300">
      {message}
    </span>
  </div>
)

// Progress bar component
const ProgressBar = ({ 
  value = 0, 
  max = 100, 
  className, 
  showPercentage = false,
  size = 'md' 
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  return (
    <div className={cn('w-full', className)}>
      <div className={cn(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <div
          className="h-full bg-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-300 mt-1">
          <span>{Math.round(percentage)}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
    </div>
  )
}

// Pulse loader component
const PulseLoader = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className={cn(
        'bg-brand-500 rounded-full animate-pulse-gentle',
        sizeClasses[size]
      )} />
    </div>
  )
}

export {
  Spinner,
  LoadingDots,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  LoadingOverlay,
  PageLoading,
  InlineLoading,
  ProgressBar,
  PulseLoader
}