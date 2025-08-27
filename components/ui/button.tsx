'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-olive-600 text-white shadow hover:bg-olive-700',
        primary: 'bg-olive-600 text-white shadow hover:bg-olive-700',
        secondary: 'bg-gold-500 text-white shadow hover:bg-gold-600',
        destructive: 'bg-softred-500 text-white shadow hover:bg-softred-600',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        success: 'bg-moss-500 text-white shadow hover:bg-moss-600',
        warning: 'bg-amber-500 text-white shadow hover:bg-amber-600',
      },
      size: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 py-2',
        lg: 'h-10 px-8',
        xl: 'h-11 px-10 text-base',
        icon: 'h-9 w-9',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      fullWidth: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false, 
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    disabled,
    children,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    const loadingIcon = loading && (
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    )

    const content = (
      <>
        {loading && iconPosition === 'left' && loadingIcon}
        {!loading && icon && iconPosition === 'left' && icon}
        <span>{loading && loadingText ? loadingText : children}</span>
        {!loading && icon && iconPosition === 'right' && icon}
        {loading && iconPosition === 'right' && loadingIcon}
      </>
    )

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {asChild ? children : content}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }