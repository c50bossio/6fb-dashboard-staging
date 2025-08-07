'use client'

export default function Badge({ 
  children, 
  variant = 'default',
  size = 'default',
  className = '',
  ...props 
}) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    secondary: 'bg-purple-100 text-purple-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    
    // Solid variants
    'solid-default': 'bg-gray-800 text-white',
    'solid-primary': 'bg-blue-600 text-white',
    'solid-secondary': 'bg-purple-600 text-white',
    'solid-success': 'bg-green-600 text-white',
    'solid-warning': 'bg-yellow-500 text-white',
    'solid-error': 'bg-red-600 text-white',
    'solid-info': 'bg-blue-600 text-white',
    
    // Outline variants
    'outline-default': 'border border-gray-300 text-gray-700 bg-white',
    'outline-primary': 'border border-blue-300 text-blue-700 bg-white',
    'outline-secondary': 'border border-purple-300 text-purple-700 bg-white',
    'outline-success': 'border border-green-300 text-green-700 bg-white',
    'outline-warning': 'border border-yellow-300 text-yellow-700 bg-white',
    'outline-error': 'border border-red-300 text-red-700 bg-white',
    'outline-info': 'border border-blue-300 text-blue-700 bg-white'
  }

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm'
  }

  return (
    <span
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}

// Status Badge - Specialized for status indicators
export function StatusBadge({ status, className = '', ...props }) {
  const statusConfig = {
    active: { variant: 'success', text: 'Active' },
    inactive: { variant: 'default', text: 'Inactive' },
    pending: { variant: 'warning', text: 'Pending' },
    error: { variant: 'error', text: 'Error' },
    success: { variant: 'success', text: 'Success' },
    processing: { variant: 'info', text: 'Processing' },
    draft: { variant: 'default', text: 'Draft' },
    published: { variant: 'success', text: 'Published' },
    archived: { variant: 'default', text: 'Archived' }
  }

  const config = statusConfig[status] || { variant: 'default', text: status }

  return (
    <Badge variant={config.variant} className={className} {...props}>
      <div className="w-1.5 h-1.5 rounded-full bg-current mr-1.5"></div>
      {config.text}
    </Badge>
  )
}

// Count Badge - For numerical indicators
export function CountBadge({ count, max = 99, variant = 'error', className = '', ...props }) {
  const displayCount = count > max ? `${max}+` : count.toString()
  
  if (count === 0) return null

  return (
    <Badge 
      variant={`solid-${variant}`} 
      size="sm" 
      className={`min-w-[1.25rem] h-5 px-1.5 text-xs leading-4 ${className}`}
      {...props}
    >
      {displayCount}
    </Badge>
  )
}