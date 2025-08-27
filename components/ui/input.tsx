'use client'

import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, Check, Eye, EyeOff, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const inputVariants = cva(
  'flex w-full rounded-lg border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
  {
    variants: {
      inputSize: {
        xs: 'h-7 px-2 text-xs',
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-3 py-1',
        lg: 'h-10 px-4 py-2',
        xl: 'h-11 px-4 py-2 text-base',
      },
      hasError: {
        true: 'border-softred-500 focus-visible:ring-softred-500',
        false: '',
      },
      hasSuccess: {
        true: 'border-moss-500 focus-visible:ring-moss-500',
        false: '',
      },
    },
    defaultVariants: {
      inputSize: 'md',
      hasError: false,
      hasSuccess: false,
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string
  error?: string
  helperText?: string
  success?: boolean
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
  containerClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    containerClassName,
    type = 'text',
    inputSize,
    label,
    error,
    helperText,
    success,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    onRightIconClick,
    disabled,
    required,
    id,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const inputId = id || React.useId()
    const hasError = Boolean(error)
    const hasSuccess = Boolean(success) && !hasError

    // Handle password visibility toggle
    const isPasswordType = type === 'password'
    const inputType = isPasswordType && showPassword ? 'text' : type

    const handleRightIconClick = React.useCallback(() => {
      if (isPasswordType) {
        setShowPassword(!showPassword)
      }
      onRightIconClick?.()
    }, [isPasswordType, showPassword, onRightIconClick])

    // Determine which right icon to show
    const rightIconToShow = React.useMemo(() => {
      if (hasError) return AlertCircle
      if (hasSuccess) return Check
      if (isPasswordType) return showPassword ? EyeOff : Eye
      return RightIcon
    }, [hasError, hasSuccess, isPasswordType, showPassword, RightIcon])

    return (
      <div className={cn('space-y-1.5', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {label}
            {required && <span className="ml-1 text-softred-500">*</span>}
          </label>
        )}
        
        <div className="relative">
          {LeftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <LeftIcon className="h-4 w-4" aria-hidden="true" />
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ inputSize, hasError, hasSuccess }),
              LeftIcon && 'pl-9',
              rightIconToShow && 'pr-9',
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          
          {rightIconToShow && (
            <button
              type="button"
              onClick={handleRightIconClick}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                hasError && 'text-softred-500',
                hasSuccess && 'text-moss-500',
                !hasError && !hasSuccess && 'text-muted-foreground hover:text-foreground',
                (isPasswordType || onRightIconClick) && 'cursor-pointer',
                (!isPasswordType && !onRightIconClick) && 'pointer-events-none'
              )}
              tabIndex={-1}
              aria-label={isPasswordType ? (showPassword ? 'Hide password' : 'Show password') : undefined}
            >
              {React.createElement(rightIconToShow, { 
                className: 'h-4 w-4',
                'aria-hidden': true 
              })}
            </button>
          )}
        </div>
        
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-softred-500" role="alert">
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export { Input, inputVariants }