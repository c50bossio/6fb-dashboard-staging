'use client'

import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const cardVariants = cva(
  'rounded-xl border transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-white border-gray-200 shadow-soft dark:bg-gray-800 dark:border-gray-700',
        elevated: 'bg-white border-gray-200 shadow-medium dark:bg-gray-800 dark:border-gray-700',
        ghost: 'bg-transparent border-transparent',
        outline: 'bg-transparent border-gray-200 dark:border-gray-700'
      },
      hover: {
        none: '',
        lift: 'hover:shadow-medium hover:-translate-y-1',
        glow: 'hover:shadow-strong hover:border-brand-300 dark:hover:border-brand-600'
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8'
      }
    },
    defaultVariants: {
      variant: 'default',
      hover: 'none',
      padding: 'md'
    }
  }
)

const Card = forwardRef(({ 
  className, 
  variant, 
  hover, 
  padding, 
  children, 
  ...props 
}, ref) => (
  <div
    ref={ref}
    className={cn(cardVariants({ variant, hover, padding, className }))}
    {...props}
  >
    {children}
  </div>
))

Card.displayName = 'Card'

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-4', className)}
    {...props}
  />
))

CardHeader.displayName = 'CardHeader'

const CardTitle = forwardRef(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-gray-900 dark:text-white', className)}
    {...props}
  >
    {children}
  </h3>
))

CardTitle.displayName = 'CardTitle'

const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600 dark:text-gray-300', className)}
    {...props}
  />
))

CardDescription.displayName = 'CardDescription'

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('pt-0', className)}
    {...props}
  />
))

CardContent.displayName = 'CardContent'

const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-4', className)}
    {...props}
  />
))

CardFooter.displayName = 'CardFooter'

export { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  cardVariants 
}