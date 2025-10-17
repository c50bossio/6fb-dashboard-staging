import { useRef, useEffect, useState, forwardRef, memo } from 'react'
import { autoFormat, validators } from '../../lib/formatters'

// Input behavior types
export const INPUT_TYPES = {
  STABLE: 'stable',         // Stable state management, no re-render loops
  BULLETPROOF: 'bulletproof', // Simple, robust input with minimal state
  NUCLEAR: 'nuclear',       // Advanced features with auto-formatting and validation
  STANDARD: 'standard',     // Basic controlled input
  UNCONTROLLED: 'uncontrolled' // Uncontrolled input for performance
}

const UnifiedFormInput = memo(forwardRef(({ 
  // Core props
  type = 'text', 
  value,
  defaultValue = '', 
  onChange, 
  onBlur,
  placeholder = '', 
  className = 'input-field',
  name,
  autoComplete,
  
  // Behavior configuration
  behavior = INPUT_TYPES.STANDARD,
  autoFormatting = false,
  validation = false,
  
  // Advanced options
  debounceMs = 0,
  
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  
  // State management based on behavior type
  const [internalValue, setInternalValue] = useState(
    behavior === INPUT_TYPES.STABLE ? (value || defaultValue) : defaultValue
  )
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState('')
  
  // Refs for different behaviors
  const lastUserValue = useRef(defaultValue)
  const lastExternalValue = useRef(value)
  const isUserTyping = useRef(false)
  const initialValue = useRef(defaultValue)
  const isInitialized = useRef(false)
  const debounceTimer = useRef(null)

  // Validation function
  const validateInput = (inputValue) => {
    if (!validation || !name) return { isValid: true, message: '' }
    
    const validator = validators[name] || validators[type]
    if (validator) {
      const result = validator(inputValue)
      return { isValid: result.isValid, message: result.message || '' }
    }
    return { isValid: true, message: '' }
  }

  // Auto-formatting function
  const formatInput = (inputValue) => {
    if (!autoFormatting || !name) return inputValue
    
    const formatter = autoFormat[name] || autoFormat[type]
    return formatter ? formatter(inputValue) : inputValue
  }

  // Effect for handling external value changes (STABLE behavior)
  useEffect(() => {
    if (behavior === INPUT_TYPES.STABLE) {
      if (!isUserTyping.current && value !== lastExternalValue.current) {
        setInternalValue(value || '')
        lastExternalValue.current = value
      }
    }
  }, [value, behavior])

  // Effect for default value initialization (BULLETPROOF & NUCLEAR)
  useEffect(() => {
    if (behavior === INPUT_TYPES.BULLETPROOF || behavior === INPUT_TYPES.NUCLEAR) {
      if (actualRef.current && defaultValue) {
        if (behavior === INPUT_TYPES.NUCLEAR) {
          if (!isInitialized.current || (defaultValue && defaultValue !== initialValue.current)) {
            actualRef.current.value = defaultValue
            initialValue.current = defaultValue
            isInitialized.current = true
          }
        } else {
          actualRef.current.value = defaultValue
          lastUserValue.current = defaultValue
        }
      }
    }
  }, [defaultValue, behavior])

  // Debounced change handler
  const debouncedOnChange = (callback, value, event) => {
    if (debounceMs > 0) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      debounceTimer.current = setTimeout(() => {
        callback(event)
      }, debounceMs)
    } else {
      callback(event)
    }
  }

  // Main change handler - behavior-specific logic
  const handleChange = (e) => {
    const newValue = e.target.value
    
    switch (behavior) {
      case INPUT_TYPES.STABLE:
        isUserTyping.current = true
        setInternalValue(newValue)
        lastExternalValue.current = newValue
        
        if (onChange) {
          debouncedOnChange(onChange, newValue, e)
        }
        
        setTimeout(() => {
          isUserTyping.current = false
        }, 100)
        break
        
      case INPUT_TYPES.BULLETPROOF:
        lastUserValue.current = newValue
        if (onChange) {
          debouncedOnChange(onChange, newValue, e)
        }
        break
        
      case INPUT_TYPES.NUCLEAR:
        // Handle auto-formatting
        const formattedValue = formatInput(newValue)
        if (formattedValue !== newValue && actualRef.current) {
          actualRef.current.value = formattedValue
        }
        
        // Handle validation
        if (validation) {
          const validationResult = validateInput(formattedValue)
          setIsValid(validationResult.isValid)
          setValidationMessage(validationResult.message)
        }
        
        if (onChange) {
          const modifiedEvent = { ...e, target: { ...e.target, value: formattedValue } }
          debouncedOnChange(onChange, formattedValue, modifiedEvent)
        }
        break
        
      case INPUT_TYPES.UNCONTROLLED:
        // Let the DOM handle it, only call onChange
        if (onChange) {
          debouncedOnChange(onChange, newValue, e)
        }
        break
        
      default: // STANDARD
        if (onChange) {
          debouncedOnChange(onChange, newValue, e)
        }
        break
    }
  }

  // Blur handler (primarily for NUCLEAR behavior)
  const handleBlur = (e) => {
    if (behavior === INPUT_TYPES.NUCLEAR && onBlur) {
      onBlur(e)
    } else if (onBlur) {
      onBlur(e)
    }
  }

  // Determine input props based on behavior
  const getInputProps = () => {
    const baseProps = {
      ref: actualRef,
      type,
      placeholder,
      className: `${className} ${!isValid && validation ? 'border-red-500' : ''}`,
      name,
      autoComplete,
      onChange: handleChange,
      onBlur: handleBlur,
      ...props
    }

    switch (behavior) {
      case INPUT_TYPES.STABLE:
        return {
          ...baseProps,
          value: internalValue
        }
        
      case INPUT_TYPES.UNCONTROLLED:
        return {
          ...baseProps,
          defaultValue
        }
        
      case INPUT_TYPES.BULLETPROOF:
      case INPUT_TYPES.NUCLEAR:
        return {
          ...baseProps,
          defaultValue
        }
        
      default: // STANDARD
        return {
          ...baseProps,
          value: value !== undefined ? value : defaultValue
        }
    }
  }

  return (
    <div className="unified-form-input-container">
      <input {...getInputProps()} />
      {validation && !isValid && validationMessage && (
        <div className="validation-message text-red-500 text-sm mt-1">
          {validationMessage}
        </div>
      )}
    </div>
  )
}))

UnifiedFormInput.displayName = 'UnifiedFormInput'

export default UnifiedFormInput

// Export convenience components for easy migration
export const StableInput = forwardRef((props, ref) => (
  <UnifiedFormInput {...props} ref={ref} behavior={INPUT_TYPES.STABLE} />
))

export const BulletproofInput = forwardRef((props, ref) => (
  <UnifiedFormInput {...props} ref={ref} behavior={INPUT_TYPES.BULLETPROOF} />
))

export const NuclearInput = forwardRef((props, ref) => (
  <UnifiedFormInput {...props} ref={ref} behavior={INPUT_TYPES.NUCLEAR} autoFormatting validation />
))

export const UncontrolledInput = forwardRef((props, ref) => (
  <UnifiedFormInput {...props} ref={ref} behavior={INPUT_TYPES.UNCONTROLLED} />
))

StableInput.displayName = 'StableInput'
BulletproofInput.displayName = 'BulletproofInput'
NuclearInput.displayName = 'NuclearInput'
UncontrolledInput.displayName = 'UncontrolledInput'