'use client'

import { ArrowPathIcon } from '@heroicons/react/24/outline'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  loadingText = 'Loading...',
  className = '',
  onClick,
  ...props
}) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 focus:ring-blue-500 shadow-md hover:shadow-lg transform hover:scale-105',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500',
    ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500',
    cta: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 hover:from-yellow-300 hover:to-orange-300 focus:ring-yellow-500 shadow-lg hover:shadow-xl transform hover:scale-105 font-bold',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizes = {
    sm: 'px-4 py-3 text-sm min-h-[44px]',
    md: 'px-4 py-2.5 text-base min-h-[44px]',
    lg: 'px-6 py-3 text-lg min-h-[48px]',
    xl: 'px-8 py-4 text-xl min-h-[52px]'
  }
  
  const isDisabled = disabled || loading
  
  const handleClick = (e) => {
    if (!isDisabled && onClick) {
      onClick(e)
    }
  }
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className} ${
        isDisabled ? 'transform-none hover:scale-100' : ''
      }`}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {loading && (
        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
      )}
      {loading ? loadingText : children}
    </button>
  )
}

export function ButtonGroup({ children, className = '' }) {
  return (
    <div className={`flex flex-col sm:flex-row gap-4 ${className}`}>
      {children}
    </div>
  )
}

// Specialized CTA Button with enhanced loading states
export function CTAButton({ 
  children, 
  loading = false, 
  success = false,
  loadingText = 'Processing...',
  successText = 'Success!',
  className = '',
  ...props 
}) {
  if (success) {
    return (
      <Button
        variant="primary"
        className={`bg-green-500 hover:bg-green-600 ${className}`}
        disabled
        {...props}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        {successText}
      </Button>
    )
  }
  
  return (
    <Button
      variant="cta"
      loading={loading}
      loadingText={loadingText}
      className={className}
      {...props}
    >
      {children}
    </Button>
  )
}