'use client'

import { 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'


export default function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "warning", // warning, danger, success, info
  loading = false,
  children
}) {
  if (!isOpen) return null

  const typeStyles = {
    warning: {
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    danger: {
      icon: ExclamationTriangleIcon,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    success: {
      icon: CheckCircleIcon,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    },
    info: {
      icon: InformationCircleIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  const style = typeStyles[type]
  const Icon = style.icon

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Confirmation action failed:', error)
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div 
        className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
        onClick={handleBackdropClick}
      >
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
        ></div>

        {/* Center the modal */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="relative inline-block align-bottom bg-white rounded-2xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Close button */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              onClick={onClose}
              disabled={loading}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            {/* Icon */}
            <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${style.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
              <Icon className={`h-6 w-6 ${style.iconColor}`} aria-hidden="true" />
            </div>

            {/* Content */}
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
              <h3 className="text-lg leading-6 font-medium text-gray-900 pr-8" id="modal-title">
                {title}
              </h3>
              
              <div className="mt-2">
                {message && (
                  <p className="text-sm text-gray-600 mb-4">
                    {message}
                  </p>
                )}
                {children}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-5 sm:mt-4 sm:ml-10 sm:pl-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all sm:ml-3 sm:w-auto sm:text-sm ${style.confirmButton} ${loading ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}`}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {loading ? 'Processing...' : confirmText}
            </button>
            
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors sm:mt-0 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Predefined common dialogs
export const SaveChangesDialog = ({ isOpen, onClose, onSave, hasChanges }) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onSave}
    type="info"
    title="Save Changes"
    message={hasChanges ? "You have unsaved changes. Would you like to save them before continuing?" : "Save your current customization settings?"}
    confirmText="Save Changes"
    cancelText="Don't Save"
  />
)

export const DiscardChangesDialog = ({ isOpen, onClose, onDiscard }) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onDiscard}
    type="warning"
    title="Discard Changes"
    message="Are you sure you want to discard your unsaved changes? This action cannot be undone."
    confirmText="Discard Changes"
    cancelText="Keep Editing"
  />
)

export const DeleteConfirmDialog = ({ isOpen, onClose, onDelete, itemName = "item" }) => (
  <ConfirmationDialog
    isOpen={isOpen}
    onClose={onClose}
    onConfirm={onDelete}
    type="danger"
    title={`Delete ${itemName}`}
    message={`Are you sure you want to delete this ${itemName}? This action cannot be undone.`}
    confirmText="Delete"
    cancelText="Cancel"
  />
)