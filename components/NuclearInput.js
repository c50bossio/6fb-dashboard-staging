import { useRef, useEffect, useState, forwardRef, memo } from 'react'
import { autoFormat, validators } from '../lib/formatters'

// NUCLEAR SOLUTION: DOM-only input that completely bypasses React state
const NuclearInput = memo(forwardRef(({ 
  type = 'text', 
  defaultValue = '', 
  onBlur, // Only notify parent on blur, not during typing
  placeholder = '', 
  className = 'input-field',
  name,
  autoFormatting = true, // Enable auto-formatting by default
  validation = false, // Enable validation feedback
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const initialValue = useRef(defaultValue)
  const isInitialized = useRef(false)
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Set initial value and handle defaultValue updates
  useEffect(() => {
    if (actualRef.current) {
      // Update value when defaultValue changes, even after initialization
      if (!isInitialized.current || (defaultValue && defaultValue !== initialValue.current)) {
        console.log('NUCLEAR: Setting value to', defaultValue, 'for input type', type)
        actualRef.current.value = defaultValue || ''
        initialValue.current = defaultValue || ''
        isInitialized.current = true
      }
    }
  }, [defaultValue, type])
  
  // Handle input event for auto-formatting
  const handleInput = (e) => {
    if (autoFormatting) {
      const currentValue = e.target.value
      const formattedValue = autoFormat(currentValue, type, name, placeholder)
      
      if (formattedValue !== currentValue) {
        // Store cursor position
        const cursorPosition = e.target.selectionStart
        const lengthDiff = formattedValue.length - currentValue.length
        
        // Apply formatted value
        e.target.value = formattedValue
        
        // Restore cursor position (adjust for length change)
        const newCursorPosition = Math.max(0, cursorPosition + lengthDiff)
        e.target.setSelectionRange(newCursorPosition, newCursorPosition)
        
        console.log('NUCLEAR: Auto-formatted', type, 'from', currentValue, 'to', formattedValue)
      }
    }
  }

  // Handle blur event - validate and communicate with parent
  const handleBlur = (e) => {
    const value = e.target.value
    
    // Perform validation if enabled
    if (validation && value) {
      let isValidInput = true
      let message = ''
      
      // Auto-detect validation based on input type
      if (type === 'tel' && validators.phone) {
        isValidInput = validators.phone(value)
        message = isValidInput ? '' : 'Please enter a valid phone number'
      } else if (type === 'email' && validators.email) {
        isValidInput = validators.email(value)
        message = isValidInput ? '' : 'Please enter a valid email address'
      }
      
      setIsValid(isValidInput)
      setValidationMessage(message)
    }
    
    if (onBlur) {
      onBlur(e)
    }
  }
  
  // Prevent React from ever interfering with this input
  useEffect(() => {
    const input = actualRef.current
    if (!input) return
    
    // Get original value descriptor to work with native DOM behavior
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')
    const originalValueGetter = originalDescriptor.get
    const originalValueSetter = originalDescriptor.set
    
    Object.defineProperty(input, 'value', {
      get() {
        // Use the native DOM getter
        return originalValueGetter.call(input)
      },
      set(newValue) {
        // Use native DOM setter - this will properly clear and set values
        originalValueSetter.call(input, newValue)
        console.log('NUCLEAR: Set value to:', newValue)
      }
    })
    
    // Block external modifications
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          const newValue = input.getAttribute('value')
          if (document.activeElement !== input && newValue !== input.value) {
            console.warn('BLOCKED external value modification:', {
              attempted: newValue,
              keeping: input.value
            })
            input.setAttribute('value', input.value)
          }
        }
      })
    })
    
    observer.observe(input, {
      attributes: true,
      attributeFilter: ['value']
    })
    
    return () => {
      observer.disconnect()
    }
  }, [])
  
  return (
    <div className="nuclear-input-container">
      <input
        ref={actualRef}
        type={type}
        name={name}
        onInput={handleInput}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`${className} ${!isValid ? 'border-red-500 focus:ring-red-500' : ''}`}
        
        // Aggressive anti-interference
        autoComplete="new-password"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        
        // Random attributes to confuse form fillers
        data-nuclear={Math.random().toString(36)}
        
        {...props}
      />
      
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
    </div>
  )
}))

NuclearInput.displayName = 'NuclearInput'

export default NuclearInput