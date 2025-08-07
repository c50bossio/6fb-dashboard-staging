import { useState, useRef, useEffect, forwardRef, memo } from 'react'

// Completely isolated input component that maintains focus
const StableInput = memo(forwardRef(({ 
  type = 'text', 
  value = '', 
  onChange, 
  placeholder = '', 
  className = 'input-field',
  autoComplete,
  ...props 
}, ref) => {
  // Internal state to prevent external re-renders from affecting input
  const [internalValue, setInternalValue] = useState(value)
  const inputRef = useRef(null)
  const isUserTyping = useRef(false)
  const lastExternalValue = useRef(value)
  
  // Use forwarded ref or internal ref
  const actualRef = ref || inputRef
  
  // Only update internal value when external value changes from a different source
  // (not from our own onChange calls)
  useEffect(() => {
    // Only update if external value changed AND we're not currently typing
    if (!isUserTyping.current && value !== lastExternalValue.current) {
      setInternalValue(value)
      lastExternalValue.current = value
    }
  }, [value])
  
  // Handle input changes
  const handleChange = (e) => {
    const newValue = e.target.value
    isUserTyping.current = true
    setInternalValue(newValue)
    
    // Call external onChange but don't let it affect our internal state immediately
    if (onChange) {
      onChange(e)
    }
    
    // Reset typing flag after a reasonable delay
    setTimeout(() => {
      isUserTyping.current = false
    }, 300) // Increased delay to prevent race conditions
  }
  
  // Handle focus events to prevent losing focus
  const handleFocus = (e) => {
    e.stopPropagation()
    isUserTyping.current = true // Mark as typing when focused
  }
  
  const handleBlur = (e) => {
    isUserTyping.current = false
    // Update our reference to the current external value on blur
    lastExternalValue.current = value
  }
  
  return (
    <input
      ref={actualRef}
      type={type}
      value={internalValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      autoComplete={autoComplete}
      {...props}
    />
  )
}))

StableInput.displayName = 'StableInput'

export default StableInput