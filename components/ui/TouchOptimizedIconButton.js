'use client'

import { useState } from 'react'

/**
 * TouchOptimizedIconButton - WCAG 2.2 AA compliant icon button component
 * Ensures minimum 44px touch targets for mobile accessibility
 */
export default function TouchOptimizedIconButton({
  children,
  onClick,
  variant = 'default',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  ariaLabel,
  ...props
}) {
  const [isPressed, setIsPressed] = useState(false)

  const baseClasses = 'inline-flex items-center justify-center rounded-lg transition-all duration-150 ease-out select-none outline-none focus:ring-2 focus:ring-offset-2 relative'
  
  const sizeClasses = {
    small: 'min-h-[44px] min-w-[44px] p-3',
    medium: 'min-h-[44px] min-w-[44px] p-3',
    large: 'min-h-[48px] min-w-[48px] p-4'
  }
  
  const variantClasses = {
    default: disabled 
      ? 'text-gray-400 cursor-not-allowed'
      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500',
    primary: disabled
      ? 'bg-olive-300 text-white cursor-not-allowed'
      : 'bg-olive-600 text-white hover:bg-olive-700 active:bg-olive-800 focus:ring-olive-500 shadow-sm hover:shadow-md',
    secondary: disabled
      ? 'bg-gray-200 text-gray-400 border border-gray-200 cursor-not-allowed'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus:ring-gray-500 shadow-sm',
    danger: disabled
      ? 'text-red-300 cursor-not-allowed'
      : 'text-red-600 hover:text-red-800 hover:bg-red-50 active:bg-red-100 focus:ring-red-500',
    success: disabled
      ? 'text-green-300 cursor-not-allowed'
      : 'text-green-600 hover:text-green-800 hover:bg-green-50 active:bg-green-100 focus:ring-green-500',
    ghost: disabled
      ? 'text-gray-400 cursor-not-allowed'
      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500'
  }

  const handleTouchStart = () => {
    if (!disabled) {
      setIsPressed(true)
    }
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
  }

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      if (navigator.vibrate) {
        navigator.vibrate(8) // Very brief vibration
      }
      onClick(e)
    }
  }

  const combinedClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${isPressed ? 'transform scale-95' : ''}
    ${className}
  `.trim()

  if (!ariaLabel) {
    console.warn('TouchOptimizedIconButton: ariaLabel is required for accessibility')
  }

  return (
    <button
      className={combinedClasses}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      )}
      <div className={loading ? 'opacity-0' : ''}>
        {children}
      </div>
    </button>
  )
}

/**
 * Specialized close button with proper accessibility
 */
export function TouchCloseButton({ onClose, className = '', ...props }) {
  return (
    <TouchOptimizedIconButton
      onClick={onClose}
      variant="ghost"
      ariaLabel="Close"
      className={className}
      {...props}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </TouchOptimizedIconButton>
  )
}

/**
 * Specialized menu button with proper accessibility
 */
export function TouchMenuButton({ onToggle, isOpen = false, className = '', ...props }) {
  return (
    <TouchOptimizedIconButton
      onClick={onToggle}
      variant="ghost"
      ariaLabel={isOpen ? "Close menu" : "Open menu"}
      className={className}
      {...props}
    >
      {isOpen ? (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      )}
    </TouchOptimizedIconButton>
  )
}

/**
 * Specialized notification button with badge support
 */
export function TouchNotificationButton({ onClick, count = 0, className = '', ...props }) {
  return (
    <TouchOptimizedIconButton
      onClick={onClick}
      variant="ghost"
      ariaLabel={count > 0 ? `${count} notifications` : "Notifications"}
      className={`relative ${className}`}
      {...props}
    >
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V4h5v13z" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </TouchOptimizedIconButton>
  )
}