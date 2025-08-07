'use client'

import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function Alert({
  children,
  variant = 'info',
  size = 'default',
  dismissible = false,
  onDismiss,
  title,
  className = '',
  ...props
}) {
  const baseClasses = 'rounded-lg border p-4'

  const variants = {
    success: {
      container: 'bg-green-50 border-green-200',
      icon: 'text-green-400',
      title: 'text-green-800',
      content: 'text-green-700',
      IconComponent: CheckCircleIcon
    },
    error: {
      container: 'bg-red-50 border-red-200',
      icon: 'text-red-400',
      title: 'text-red-800',
      content: 'text-red-700',
      IconComponent: XCircleIcon
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-400',
      title: 'text-yellow-800',
      content: 'text-yellow-700',
      IconComponent: ExclamationTriangleIcon
    },
    info: {
      container: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-400',
      title: 'text-blue-800',
      content: 'text-blue-700',
      IconComponent: InformationCircleIcon
    }
  }

  const sizes = {
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6'
  }

  const config = variants[variant]
  const IconComponent = config.IconComponent

  return (
    <div
      className={`${baseClasses} ${config.container} ${sizes[size]} ${className}`}
      {...props}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <IconComponent className={`h-5 w-5 ${config.icon}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.title} mb-1`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.content}`}>
            {children}
          </div>
        </div>
        {dismissible && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.content} hover:${config.container}`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Inline Alert - Minimal version for form validation
export function InlineAlert({ children, variant = 'error', className = '' }) {
  const variants = {
    success: {
      icon: 'text-green-400',
      content: 'text-green-600',
      IconComponent: CheckCircleIcon
    },
    error: {
      icon: 'text-red-400',
      content: 'text-red-600',
      IconComponent: XCircleIcon
    },
    warning: {
      icon: 'text-yellow-400',
      content: 'text-yellow-600',
      IconComponent: ExclamationTriangleIcon
    },
    info: {
      icon: 'text-blue-400',
      content: 'text-blue-600',
      IconComponent: InformationCircleIcon
    }
  }

  const config = variants[variant]
  const IconComponent = config.IconComponent

  return (
    <div className={`flex items-center text-sm ${config.content} ${className}`}>
      <IconComponent className={`h-4 w-4 mr-1.5 flex-shrink-0 ${config.icon}`} />
      {children}
    </div>
  )
}

// Toast Alert - For notification system
export function ToastAlert({
  children,
  variant = 'info',
  dismissible = true,
  onDismiss,
  title,
  className = '',
  ...props
}) {
  return (
    <Alert
      variant={variant}
      dismissible={dismissible}
      onDismiss={onDismiss}
      title={title}
      className={`shadow-lg border-0 animate-slideInRight ${className}`}
      {...props}
    >
      {children}
    </Alert>
  )
}

// Alert Description - For detailed alert content
export function AlertDescription({ children, className = '' }) {
  return (
    <div className={`mt-1 text-sm ${className}`}>
      {children}
    </div>
  )
}