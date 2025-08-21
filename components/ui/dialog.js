import React, { createContext, useContext, useState, useEffect } from 'react'

const DialogContext = createContext()

export const Dialog = ({ children, open, onOpenChange, ...props }) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = open !== undefined ? open : internalOpen
  
  const handleOpenChange = (newOpen) => {
    if (open === undefined) {
      setInternalOpen(newOpen)
    }
    if (onOpenChange) {
      onOpenChange(newOpen)
    }
  }
  
  return (
    <DialogContext.Provider value={{ open: isOpen, onOpenChange: handleOpenChange }}>
      {children}
      {isOpen && <DialogOverlay />}
    </DialogContext.Provider>
  )
}

export const DialogTrigger = ({ children, asChild = false, ...props }) => {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('DialogTrigger must be used within a Dialog component')
  }
  
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: () => context.onOpenChange(true),
      ...props
    })
  }
  
  return (
    <button onClick={() => context.onOpenChange(true)} {...props}>
      {children}
    </button>
  )
}

const DialogOverlay = () => {
  const context = useContext(DialogContext)
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        context.onOpenChange(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [context])
  
  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={() => context.onOpenChange(false)}
    >
      <DialogContent />
    </div>
  )
}

export const DialogContent = ({ children, className = '', ...props }) => {
  const context = useContext(DialogContext)
  
  return (
    <div 
      className={`bg-white rounded-lg shadow-xl max-w-md w-full max-h-full overflow-y-auto ${className}`}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </div>
  )
}

export const DialogHeader = ({ children, className = '', ...props }) => {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`} {...props}>
      {children}
    </div>
  )
}

export const DialogTitle = ({ children, className = '', ...props }) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
      {children}
    </h2>
  )
}

export const DialogDescription = ({ children, className = '', ...props }) => {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`} {...props}>
      {children}
    </p>
  )
}