'use client'

import { forwardRef, useState } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const inputVariants = cva(
  'flex w-full rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-gray-400 dark:placeholder:text-gray-500',
  {
    variants: {
      variant: {
        default: 'border-gray-300 bg-white text-gray-900 focus:border-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-brand-400',
        error: 'border-error-300 bg-white text-gray-900 focus:border-error-500 focus:ring-error-500 dark:border-error-600 dark:bg-gray-800',
        success: 'border-success-300 bg-white text-gray-900 focus:border-success-500 focus:ring-success-500 dark:border-success-600 dark:bg-gray-800'
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-9 px-3 text-sm',
        lg: 'h-10 px-4 text-base'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
)

const Input = forwardRef(({ 
  className, 
  type = 'text', 
  variant, 
  size, 
  error,
  leftIcon,
  rightIcon,
  ...props 
}, ref) => {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && showPassword ? 'text' : type

  const inputElement = (
    <input
      type={inputType}
      className={cn(
        inputVariants({ variant: error ? 'error' : variant, size }),
        leftIcon && 'pl-10',
        (rightIcon || isPassword) && 'pr-10',
        className
      )}
      ref={ref}
      {...props}
    />
  )

  if (leftIcon || rightIcon || isPassword) {
    return (
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <div className="w-4 h-4 text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        {inputElement}
        
        {isPassword && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeSlashIcon className="w-4 h-4" />
            ) : (
              <EyeIcon className="w-4 h-4" />
            )}
          </button>
        )}
        
        {rightIcon && !isPassword && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <div className="w-4 h-4 text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
      </div>
    )
  }

  return inputElement
})

Input.displayName = 'Input'

const FormGroup = forwardRef(({ 
  className, 
  children, 
  label, 
  htmlFor, 
  error, 
  required = false,
  description,
  ...props 
}, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props}>
    {label && (
      <label 
        htmlFor={htmlFor} 
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        {label}
        {required && <span className="text-error-500 ml-1">*</span>}
      </label>
    )}
    {description && (
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {description}
      </p>
    )}
    {children}
    {error && (
      <p className="text-sm text-error-600 dark:text-error-400">
        {error}
      </p>
    )}
  </div>
))

FormGroup.displayName = 'FormGroup'

const Textarea = forwardRef(({ 
  className, 
  rows = 3,
  resize = true,
  ...props 
}, ref) => (
  <textarea
    className={cn(
      inputVariants({ variant: 'default', size: 'md' }),
      'min-h-[80px] py-2',
      !resize && 'resize-none',
      className
    )}
    rows={rows}
    ref={ref}
    {...props}
  />
))

Textarea.displayName = 'Textarea'

export { Input, FormGroup, Textarea, inputVariants }