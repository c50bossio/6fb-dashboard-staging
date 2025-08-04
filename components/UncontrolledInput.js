import { useRef, useEffect, forwardRef, memo } from 'react'

// Completely uncontrolled input that avoids React state management issues
const UncontrolledInput = memo(forwardRef(({ 
  type = 'text', 
  defaultValue = '', 
  onChange, 
  placeholder = '', 
  className = 'input-field',
  autoComplete,
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const isInitialized = useRef(false)
  
  // Set initial value only once
  useEffect(() => {
    if (!isInitialized.current && actualRef.current) {
      actualRef.current.value = defaultValue
      isInitialized.current = true
    }
  }, [defaultValue])
  
  // Handle input changes - let the DOM handle the value
  const handleChange = (e) => {
    // Just call the onChange without any state management
    if (onChange) {
      onChange(e)
    }
  }
  
  // Prevent any external interference
  const handleFocus = (e) => {
    e.stopPropagation()
  }
  
  return (
    <input
      ref={actualRef}
      type={type}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      className={className}
      autoComplete={autoComplete}
      {...props}
    />
  )
}))

UncontrolledInput.displayName = 'UncontrolledInput'

export default UncontrolledInput