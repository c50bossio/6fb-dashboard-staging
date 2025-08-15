import { useState, useRef, useEffect, forwardRef, memo } from 'react'

const StableInput = memo(forwardRef(({ 
  type = 'text', 
  value = '', 
  onChange, 
  placeholder = '', 
  className = 'input-field',
  autoComplete,
  ...props 
}, ref) => {
  const [internalValue, setInternalValue] = useState(value)
  const inputRef = useRef(null)
  const isUserTyping = useRef(false)
  const lastExternalValue = useRef(value)
  
  const actualRef = ref || inputRef
  
  // (not from our own onChange calls)
  useEffect(() => {
    if (!isUserTyping.current && value !== lastExternalValue.current) {
      setInternalValue(value)
      lastExternalValue.current = value
    }
  }, [value])
  
  const handleChange = (e) => {
    const newValue = e.target.value
    isUserTyping.current = true
    setInternalValue(newValue)
    
    if (onChange) {
      onChange(e)
    }
    
    setTimeout(() => {
      isUserTyping.current = false
    }, 300) // Increased delay to prevent race conditions
  }
  
  const handleFocus = (e) => {
    e.stopPropagation()
    isUserTyping.current = true // Mark as typing when focused
  }
  
  const handleBlur = (e) => {
    isUserTyping.current = false
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