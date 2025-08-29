'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg border bg-card text-card-foreground',
  {
    variants: {
      variant: {
        default: 'border-border shadow-sm',
        outlined: 'border-border',
        elevated: 'border-0 shadow-lg',
        interactive: 'border-border shadow-sm transition-shadow hover:shadow-md cursor-pointer',
        ghost: 'border-0 shadow-none',
      },
      padding: {
        none: '',
        xs: 'p-2',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    title?: React.ReactNode
    description?: React.ReactNode
    action?: React.ReactNode
  }
>(({ className, title, description, action, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5', className)}
    {...props}
  >
    {(title || description || action) ? (
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-1">
          {title && (
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="ml-4 flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    ) : (
      children
    )}
  </div>
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    align?: 'left' | 'center' | 'right' | 'between'
  }
>(({ className, align = 'right', ...props }, ref) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
  }

  return (
    <div
      ref={ref}
      className={cn('flex items-center', alignmentClasses[align], className)}
      {...props}
    />
  )
})
CardFooter.displayName = 'CardFooter'

// Stat Card - A specialized card for displaying metrics
export interface StatCardProps extends Omit<CardProps, 'children'> {
  title: string
  value: React.ReactNode
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  action?: React.ReactNode
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, description, icon, trend, action, className, ...props }, ref) => (
    <Card ref={ref} className={cn('relative', className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <p className="text-2xl font-bold tracking-tight">
                {value}
              </p>
              {trend && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                    trend.isPositive
                      ? 'bg-moss-50 text-moss-700'
                      : 'bg-softred-50 text-softred-700'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {icon && (
            <div className="ml-4 flex-shrink-0">
              <div className="rounded-lg bg-primary/10 p-3 text-primary">
                {icon}
              </div>
            </div>
          )}
        </div>
        {action && (
          <div className="mt-4 border-t pt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  )
)
StatCard.displayName = 'StatCard'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  StatCard,
  cardVariants,
}