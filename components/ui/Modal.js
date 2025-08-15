'use client'

/**
 * Standardized Modal components for consistent dialog patterns across the dashboard
 * Replaces scattered modal implementations with reusable, accessible components
 */

import { XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect } from 'react'

export function Modal({ 
  isOpen = false, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  closeOnBackdrop = true,
  showCloseButton = true,
  className = ''
}) {
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    xlarge: 'max-w-6xl',
    full: 'max-w-full mx-4'
  }

  // Handle escape key press
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div 
        className={`bg-white rounded-lg w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>

      {/* Backdrop click handler */}
      {closeOnBackdrop && (
        <div 
          className="absolute inset-0 -z-10" 
          onClick={onClose}
          aria-label="Close modal"
        />
      )}
    </div>
  )
}

/**
 * Specialized form modal with consistent form handling
 */
export function FormModal({ 
  isOpen = false, 
  onClose, 
  title, 
  children, 
  onSubmit,
  submitText = 'Submit',
  cancelText = 'Cancel',
  submitDisabled = false,
  size = 'medium',
  className = ''
}) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size={size}
      className={className}
      showCloseButton={true}
    >
      <form onSubmit={onSubmit}>
        {children}
        
        {/* Form Actions */}
        <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            {cancelText}
          </button>
          <button
            type="submit"
            disabled={submitDisabled}
            className="px-4 py-2 text-sm font-medium text-white bg-olive-600 border border-transparent rounded-md hover:bg-olive-700 focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitText}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/**
 * Confirmation dialog modal
 */
export function ConfirmModal({ 
  isOpen = false, 
  onClose, 
  onConfirm,
  title = 'Confirm Action', 
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'default' // 'default', 'danger', 'warning'
}) {
  const typeStyles = {
    default: {
      button: 'bg-olive-600 hover:bg-olive-700 focus:ring-olive-500',
      icon: 'text-olive-600'
    },
    danger: {
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      icon: 'text-red-600'
    },
    warning: {
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      icon: 'text-amber-600'
    }
  }

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="small"
      closeOnBackdrop={false}
    >
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        {message && (
          <p className="text-gray-600 mb-6">{message}</p>
        )}
        
        <div className="flex justify-center space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-gray-500"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:ring-2 ${typeStyles[type].button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}