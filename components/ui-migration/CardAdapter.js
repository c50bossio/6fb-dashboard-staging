'use client'

/**
 * CardAdapter - Migration wrapper from custom Card to shadcn Card
 * Maps existing Card API to shadcn/ui card component
 */

import {
  Card as ShadcnCard,
  CardContent as ShadcnCardContent,
  CardDescription as ShadcnCardDescription,
  CardFooter as ShadcnCardFooter,
  CardHeader as ShadcnCardHeader,
  CardTitle as ShadcnCardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

const variantStyles = {
  default: '',
  elevated: 'shadow-md',
  outlined: 'shadow-none border-gray-300',
  ghost: 'border-transparent shadow-none bg-gray-50',
  success: 'border-green-200 shadow-sm bg-green-50',
  warning: 'border-yellow-200 shadow-sm bg-yellow-50',
  error: 'border-red-200 shadow-sm bg-red-50',
  info: 'border-olive-200 shadow-sm bg-olive-50'
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  default: 'p-6',
  lg: 'p-8',
  xl: 'p-10'
}

const Card = ({
  children,
  variant = 'default',
  padding = 'default',
  className = '',
  hover = false,
  clickable = false,
  onClick,
  ...props
}) => {
  const interactiveClasses = hover || clickable ? 'hover:shadow-md hover:-translate-y-0.5 transition-all' : ''
  const cursorClass = clickable ? 'cursor-pointer' : ''
  
  return (
    <ShadcnCard
      className={cn(
        variantStyles[variant],
        paddingStyles[padding],
        interactiveClasses,
        cursorClass,
        className
      )}
      onClick={clickable ? onClick : undefined}
      {...props}
    >
      {children}
    </ShadcnCard>
  )
}

export const CardHeader = ({ children, className = '' }) => (
  <ShadcnCardHeader className={cn('border-b border-gray-200 pb-4 mb-6', className)}>
    {children}
  </ShadcnCardHeader>
)

export const CardTitle = ({ children, className = '', size = 'default' }) => {
  const sizes = {
    sm: 'text-lg font-semibold',
    default: 'text-xl font-semibold',
    lg: 'text-2xl font-bold'
  }
  
  return (
    <ShadcnCardTitle className={cn(sizes[size], className)}>
      {children}
    </ShadcnCardTitle>
  )
}

export const CardDescription = ShadcnCardDescription
export const CardContent = ShadcnCardContent
export const CardFooter = ({ children, className = '' }) => (
  <ShadcnCardFooter className={cn('border-t border-gray-200 pt-4 mt-6', className)}>
    {children}
  </ShadcnCardFooter>
)

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
    blue: 'text-olive-600',
    purple: 'text-gold-600',
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
    <Card hover className={className} padding="sm">
      <div className="flex items-start sm:items-center">
        <div className="flex-shrink-0">
          {Icon && <Icon className={cn('h-6 w-6 sm:h-8 sm:w-8', colors[color])} />}
        </div>
        <div className="ml-3 sm:ml-4 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1">
            <p className="text-lg sm:text-2xl font-semibold text-gray-900 truncate">{value}</p>
            {change && (
              <div className="mt-1 sm:mt-0">
                {typeof change === 'string' ? (
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', changeColors[changeType])}>
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

export default Card