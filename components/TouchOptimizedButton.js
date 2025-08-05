'use client'

import { useState } from 'react'

export default function TouchOptimizedButton({ 
  children, 
  onClick, 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  className = '',
  icon = null,
  ...props 
}) {
  const [isPressed, setIsPressed] = useState(false)

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 ease-out select-none outline-none focus:ring-2 focus:ring-offset-2'
  
  // Touch-friendly sizing (minimum 44px touch target)
  const sizeClasses = {
    small: 'px-3 py-2 text-sm min-h-[40px] min-w-[40px]',
    medium: 'px-4 py-3 text-base min-h-[44px] min-w-[44px]',
    large: 'px-6 py-4 text-lg min-h-[48px] min-w-[48px]'
  }
  
  const variantClasses = {
    primary: disabled 
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-500 shadow-md hover:shadow-lg active:shadow-sm',
    secondary: disabled
      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 active:bg-gray-100 focus:ring-gray-500 shadow-sm hover:shadow-md',
    danger: disabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
      : 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 shadow-md hover:shadow-lg active:shadow-sm',
    ghost: disabled
      ? 'text-gray-400 cursor-not-allowed'
      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-500'
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
      // Add haptic feedback on supported devices
      if (navigator.vibrate) {
        navigator.vibrate(10) // Very brief vibration
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
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {icon && !loading && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  )
}

// Specialized touch-optimized buttons
export function TouchFAB({ onClick, icon, className = '', ...props }) {
  return (
    <TouchOptimizedButton
      onClick={onClick}
      size="large"
      variant="primary"
      className={`fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 shadow-xl hover:shadow-2xl ${className}`}
      {...props}
    >
      {icon}
    </TouchOptimizedButton>
  )
}

export function TouchCard({ children, onClick, className = '', ...props }) {
  const [isPressed, setIsPressed] = useState(false)

  const handleTouchStart = () => setIsPressed(true)
  const handleTouchEnd = () => setIsPressed(false)

  const handleClick = (e) => {
    if (onClick) {
      // Add haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10)
      }
      onClick(e)
    }
  }

  return (
    <div
      className={`
        cursor-pointer select-none transition-all duration-150 ease-out
        ${isPressed ? 'transform scale-98 shadow-md' : 'hover:shadow-lg'}
        ${className}
      `}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      {...props}
    >
      {children}
    </div>
  )
}

// Touch-optimized input with larger touch targets
export function TouchInput({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  error = '',
  className = '',
  ...props 
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`
          block w-full px-4 py-3 text-base border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          placeholder-gray-400 transition-colors duration-200
          min-h-[44px] touch-manipulation
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}

// Touch-optimized textarea
export function TouchTextarea({ 
  label, 
  placeholder, 
  value, 
  onChange, 
  rows = 4,
  error = '',
  className = '',
  ...props 
}) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className={`
          block w-full px-4 py-3 text-base border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          placeholder-gray-400 transition-colors duration-200
          min-h-[44px] touch-manipulation resize-none
          ${error ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
    </div>
  )
}