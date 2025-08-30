'use client'

import React from 'react'

/**
 * Standardized Button component for consistent styling across the dashboard
 * Replaces scattered button classes with a reusable component
 */
export function Button({ 
  children, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  type = 'button',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-olive-600 text-white hover:bg-olive-700 focus:ring-olive-500 disabled:bg-gray-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 disabled:bg-gray-100',
    success: 'bg-moss-600 text-white hover:bg-moss-700 focus:ring-moss-500 disabled:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-gray-300',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
    link: 'text-olive-600 hover:text-olive-700 hover:underline focus:ring-olive-500'
  }
  
  const sizes = {
    small: 'px-3 py-2 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  }
  
  const iconSizes = {
    small: 'h-4 w-4',
    medium: 'h-4 w-4', 
    large: 'h-5 w-5'
  }
  
  const isDisabled = disabled || loading
  
  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        ${baseClasses} 
        ${variants[variant]} 
        ${sizes[size]}
        ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
      )}
      
      {Icon && iconPosition === 'left' && !loading && (
        <Icon className={`${iconSizes[size]} ${children ? 'mr-2' : ''}`} />
      )}
      
      {children}
      
      {Icon && iconPosition === 'right' && !loading && (
        <Icon className={`${iconSizes[size]} ${children ? 'ml-2' : ''}`} />
      )}
    </button>
  )
}

/**
 * Specialized button for actions (replaces .btn-primary, .btn-secondary classes)
 */
export function ActionButton({ children, ...props }) {
  return <Button variant="primary" {...props}>{children}</Button>
}

export function SecondaryButton({ children, ...props }) {
  return <Button variant="secondary" {...props}>{children}</Button>
}

/**
 * Icon-only button for compact actions
 */
export function IconButton({ icon: Icon, title, size = 'medium', ...props }) {
  return (
    <Button 
      icon={Icon} 
      size={size}
      className="!p-2" 
      title={title}
      {...props}
    />
  )
}

// Default export for import Button from '@/components/ui/Button'
export default Button