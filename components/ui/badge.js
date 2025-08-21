import React from 'react'

const variants = {
  default: 'bg-blue-100 text-blue-800 border border-blue-200',
  secondary: 'bg-gray-100 text-gray-800 border border-gray-200',
  destructive: 'bg-red-100 text-red-800 border border-red-200',
  outline: 'border border-gray-300 text-gray-700 bg-transparent',
  success: 'bg-green-100 text-green-800 border border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200'
}

export const Badge = ({ 
  children, 
  variant = 'default', 
  className = '', 
  style = {},
  ...props 
}) => {
  const variantClass = variants[variant] || variants.default
  
  return (
    <span 
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClass} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}