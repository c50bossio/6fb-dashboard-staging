'use client'

import React, { useRef, useEffect, useState, forwardRef, memo } from 'react'
import { autoFormat, validators } from '../../lib/formatters'

/**
 * UnifiedInput - Production-ready input component consolidating 6 previous implementations
 * 
 * Features:
 * - shadcn/ui design system styling
 * - Auto-formatting via lib/formatters.js
 * - Advanced validation with visual feedback
 * - Mutation protection against external interference
 * - Support for both controlled and uncontrolled patterns
 * - Form wrapper capabilities with labels and validation
 */

const UnifiedInput = memo(forwardRef(({
  // Core input props
  type = 'text',
  value,
  defaultValue = '',
  onChange,
  onBlur,
  placeholder = '',
  className = '',
  name,
  disabled = false,
  
  // Advanced features
  autoFormatting = false,
  validation = false,
  mutationProtection = false,
  protectionMode = 'observer', // 'observer' | 'interval' | 'hybrid'
  
  // Form wrapper props
  label,
  required = false,
  error,
  helper,
  
  // Styling variants
  variant = 'default', // 'default' | 'nuclear' | 'stable'
  
  ...props
}, ref) => {
  // Refs and state
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const initialValue = useRef(defaultValue)
  const isInitialized = useRef(false)
  const lastUserValue = useRef(defaultValue || '')
  const isUserTyping = useRef(false)
  const intervalRef = useRef(null)
  const observerRef = useRef(null)
  
  // Validation state
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Internal value for controlled/uncontrolled hybrid
  const [internalValue, setInternalValue] = useState(value || defaultValue)
  const isControlled = value !== undefined
  
  // Initialize input value
  useEffect(() => {
    if (actualRef.current && !isControlled) {
      if (!isInitialized.current || (defaultValue && defaultValue !== initialValue.current)) {
        actualRef.current.value = defaultValue || ''
        initialValue.current = defaultValue || ''
        lastUserValue.current = defaultValue || ''
        isInitialized.current = true
      }
    }
  }, [defaultValue, isControlled])
  
  // Update internal value when controlled value changes
  useEffect(() => {
    if (isControlled && !isUserTyping.current) {
      setInternalValue(value)
      lastUserValue.current = value || ''
    }
  }, [value, isControlled])
  
  // Setup mutation protection
  useEffect(() => {
    const input = actualRef.current
    if (!input || !mutationProtection) return
    
    // Cleanup function
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
    
    // MutationObserver protection (nuclear mode)
    if (protectionMode === 'observer' || protectionMode === 'hybrid') {
      const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
      const originalValueGetter = originalDescriptor.get
      const originalValueSetter = originalDescriptor.set
      
      Object.defineProperty(input, 'value', {
        get() {
          return originalValueGetter.call(input)
        },
        set(newValue) {
          originalValueSetter.call(input, newValue)
        }
      })
      
      observerRef.current = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
            const newValue = input.getAttribute('value')
            if (document.activeElement !== input && newValue !== input.value) {
              input.setAttribute('value', input.value)
            }
          }
        })
      })
      
      observerRef.current.observe(input, {
        attributes: true,
        attributeFilter: ['value']
      })
    }
    
    // Interval-based protection (bulletproof mode)
    if (protectionMode === 'interval' || protectionMode === 'hybrid') {
      intervalRef.current = setInterval(() => {
        if (input.value !== lastUserValue.current && document.activeElement !== input) {
          input.value = lastUserValue.current
        }
      }, 100)
    }
    
    return cleanup
  }, [mutationProtection, protectionMode])
  
  // Handle input changes
  const handleInput = (e) => {
    const currentValue = e.target.value
    let processedValue = currentValue
    
    // Apply auto-formatting
    if (autoFormatting) {
      processedValue = autoFormat(currentValue, type, name, placeholder)
      
      if (processedValue !== currentValue) {
        const cursorPosition = e.target.selectionStart
        const lengthDiff = processedValue.length - currentValue.length
        
        e.target.value = processedValue
        
        const newCursorPosition = Math.max(0, cursorPosition + lengthDiff)
        e.target.setSelectionRange(newCursorPosition, newCursorPosition)
      }
    }
    
    // Update tracking values
    lastUserValue.current = processedValue
    isUserTyping.current = true
    
    // Update internal state
    if (!isControlled) {
      setInternalValue(processedValue)
    }
    
    // Call parent onChange
    if (onChange) {
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: processedValue
        }
      }
      onChange(syntheticEvent)
    }
    
    // Reset typing flag after delay
    setTimeout(() => {
      isUserTyping.current = false
    }, 300)
  }
  
  // Handle blur events
  const handleBlur = (e) => {
    const currentValue = e.target.value
    isUserTyping.current = false
    
    // Perform validation
    if (validation && currentValue) {
      let isValidInput = true
      let message = ''
      
      if (type === 'tel' && validators.phone) {
        isValidInput = validators.phone(currentValue)
        message = isValidInput ? '' : 'Please enter a valid phone number'
      } else if (type === 'email' && validators.email) {
        isValidInput = validators.email(currentValue)
        message = isValidInput ? '' : 'Please enter a valid email address'
      } else if (name?.toLowerCase().includes('zip') && validators.zipCode) {
        isValidInput = validators.zipCode(currentValue)
        message = isValidInput ? '' : 'Please enter a valid ZIP code'
      }
      
      setIsValid(isValidInput)
      setValidationMessage(message)
    }
    
    // Update tracking
    lastUserValue.current = currentValue
    
    // Call parent onBlur
    if (onBlur) {
      onBlur(e)
    }
  }
  
  // Handle focus events
  const handleFocus = (e) => {
    e.stopPropagation()
    isUserTyping.current = true
  }
  
  // Determine final value
  const finalValue = isControlled ? value : (variant === 'stable' ? internalValue : undefined)
  
  // Base input classes (shadcn/ui design system)
  const baseClasses = `
    flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm 
    ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium 
    placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-olive-500 
    focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50
  `
  
  // Validation classes
  const validationClasses = validation && !isValid 
    ? 'border-red-500 focus:ring-red-500' 
    : ''
  
  // Error state classes
  const errorClasses = error 
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
    : ''
  
  const finalClassName = `${baseClasses} ${validationClasses} ${errorClasses} ${className}`.trim()
  
  // Anti-password manager attributes (from nuclear mode)
  const antiPMAttributes = variant === 'nuclear' ? {
    autoComplete: "new-password",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: "false",
    'data-lpignore': "true",
    'data-form-type': "other",
    'data-1p-ignore': "true",
    'data-unified': Math.random().toString(36)
  } : {}
  
  // Random name/id for bulletproof mode
  const randomId = variant === 'bulletproof' ? `input_${Math.random().toString(36).substr(2, 9)}` : undefined
  
  // Input element
  const inputElement = (
    <input
      ref={actualRef}
      type={type}
      name={name || (randomId ? randomId : undefined)}
      id={props.id || (randomId ? randomId : undefined)}
      value={finalValue}
      defaultValue={!isControlled ? defaultValue : undefined}
      onChange={isControlled ? handleInput : undefined}
      onInput={!isControlled ? handleInput : undefined}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={finalClassName}
      disabled={disabled}
      required={required}
      {...antiPMAttributes}
      {...props}
    />
  )
  
  // Return just input if no form wrapper needed
  if (!label && !error && !helper && !validation) {
    return inputElement
  }
  
  // Return with form wrapper
  const inputId = props.id || `input-${name}` || `input-${Math.random().toString(36).substr(2, 9)}`
  
  return (
    <div className="unified-input-container">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {React.cloneElement(inputElement, { id: inputId })}
      
      {/* Validation feedback */}
      {validation && validationMessage && (
        <div className="text-red-500 text-sm mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {validationMessage}
        </div>
      )}
      
      {/* Success feedback */}
      {validation && !validationMessage && actualRef.current?.value && (
        <div className="text-green-500 text-sm mt-1 flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Valid format
        </div>
      )}
      
      {/* External error */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {/* Helper text */}
      {helper && !error && !validationMessage && (
        <p className="mt-1 text-xs text-gray-500">{helper}</p>
      )}
    </div>
  )
}))

UnifiedInput.displayName = 'UnifiedInput'

// Convenience exports for different use cases
export const Input = forwardRef((props, ref) => 
  <UnifiedInput ref={ref} variant="default" {...props} />
)

export const NuclearInput = forwardRef((props, ref) => 
  <UnifiedInput 
    ref={ref} 
    variant="nuclear" 
    autoFormatting={true}
    validation={false}
    mutationProtection={true}
    protectionMode="observer"
    {...props} 
  />
)

export const BulletproofInput = forwardRef((props, ref) => 
  <UnifiedInput 
    ref={ref} 
    variant="bulletproof" 
    mutationProtection={true}
    protectionMode="interval"
    {...props} 
  />
)

export const StableInput = forwardRef((props, ref) => 
  <UnifiedInput 
    ref={ref} 
    variant="stable" 
    {...props} 
  />
)

export const UncontrolledInput = forwardRef((props, ref) => 
  <UnifiedInput 
    ref={ref} 
    variant="default" 
    {...props} 
  />
)

export const FormInput = forwardRef((props, ref) => 
  <UnifiedInput 
    ref={ref} 
    variant="default" 
    {...props} 
  />
)

Input.displayName = "Input"
NuclearInput.displayName = "NuclearInput"
BulletproofInput.displayName = "BulletproofInput" 
StableInput.displayName = "StableInput"
UncontrolledInput.displayName = "UncontrolledInput"
FormInput.displayName = "FormInput"

export default UnifiedInput