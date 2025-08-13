// Mobile-responsive utility components

export const MobileContainer = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </div>
  )
}

export const MobileCard = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-md border border-gray-200 p-4 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

export const MobileGrid = ({ children, cols = { mobile: 1, tablet: 2, desktop: 3 }, className = '' }) => {
  const gridClass = `grid grid-cols-${cols.mobile} sm:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop} gap-4 sm:gap-6`
  return (
    <div className={`${gridClass} ${className}`}>
      {children}
    </div>
  )
}

export const MobileButton = ({ children, variant = 'primary', size = 'medium', fullWidth = false, className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2'
  
  const variants = {
    primary: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  }
  
  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm sm:text-base',
    large: 'px-6 py-3 text-base sm:text-lg'
  }
  
  const widthClass = fullWidth ? 'w-full' : ''
  
  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export const MobileInput = ({ label, error, className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 py-2 
          border ${error ? 'border-red-300' : 'border-gray-300'} 
          rounded-lg 
          text-gray-900 
          placeholder-gray-400
          focus:outline-none focus:ring-2 
          ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-amber-500 focus:border-amber-500'}
          text-base sm:text-sm
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export const MobileSelect = ({ label, error, options = [], className = '', ...props }) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 py-2 
          border ${error ? 'border-red-300' : 'border-gray-300'} 
          rounded-lg 
          text-gray-900 
          focus:outline-none focus:ring-2 
          ${error ? 'focus:ring-red-500 focus:border-red-500' : 'focus:ring-amber-500 focus:border-amber-500'}
          text-base sm:text-sm
          appearance-none
          bg-white
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export const MobileHeading = ({ level = 1, children, className = '' }) => {
  const sizes = {
    1: 'text-2xl sm:text-3xl lg:text-4xl font-bold',
    2: 'text-xl sm:text-2xl lg:text-3xl font-bold',
    3: 'text-lg sm:text-xl lg:text-2xl font-semibold',
    4: 'text-base sm:text-lg lg:text-xl font-semibold',
    5: 'text-sm sm:text-base lg:text-lg font-medium',
    6: 'text-sm sm:text-base font-medium'
  }
  
  const Tag = `h${level}`
  
  return (
    <Tag className={`text-gray-900 ${sizes[level]} ${className}`}>
      {children}
    </Tag>
  )
}

export const MobileText = ({ size = 'base', children, className = '' }) => {
  const sizes = {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl'
  }
  
  return (
    <p className={`text-gray-600 ${sizes[size]} ${className}`}>
      {children}
    </p>
  )
}

export const MobileModal = ({ isOpen, onClose, title, children, size = 'medium' }) => {
  if (!isOpen) return null
  
  const sizes = {
    small: 'max-w-md',
    medium: 'max-w-lg',
    large: 'max-w-2xl',
    full: 'max-w-full mx-4'
  }
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className={`relative bg-white rounded-lg shadow-xl ${sizes[size]} w-full max-h-[90vh] overflow-y-auto`}>
          {title && (
            <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h3>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          )}
          <div className="px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

export const MobileTable = ({ headers, rows, className = '' }) => {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-900"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const MobileLoadingSpinner = ({ size = 'medium', className = '' }) => {
  const sizes = {
    small: 'h-4 w-4 border-2',
    medium: 'h-8 w-8 border-2',
    large: 'h-12 w-12 border-3'
  }
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`animate-spin rounded-full ${sizes[size]} border-b-transparent border-amber-600`} />
    </div>
  )
}

export const MobileBadge = ({ children, variant = 'default', size = 'medium', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-amber-100 text-amber-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-olive-100 text-olive-800'
  }
  
  const sizes = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-2.5 py-0.5 text-sm',
    large: 'px-3 py-1 text-base'
  }
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  )
}