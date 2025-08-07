import { useRef, useEffect, forwardRef, memo } from 'react'

// Bulletproof input that blocks all browser interference
const BulletproofInput = memo(forwardRef(({ 
  type = 'text', 
  defaultValue = '', 
  onChange, 
  placeholder = '', 
  className = 'input-field',
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const lastUserValue = useRef('')
  
  // Set initial value
  useEffect(() => {
    if (actualRef.current && defaultValue) {
      actualRef.current.value = defaultValue
      lastUserValue.current = defaultValue
    }
  }, [defaultValue])
  
  // Handle all input changes
  const handleInput = (e) => {
    const newValue = e.target.value
    lastUserValue.current = newValue
    
    // Call onChange
    if (onChange) {
      onChange(e)
    }
  }
  
  // Prevent external value changes
  useEffect(() => {
    const interval = setInterval(() => {
      if (actualRef.current && actualRef.current.value !== lastUserValue.current) {
        console.warn('BLOCKED external value change:', {
          was: actualRef.current.value,
          restoring: lastUserValue.current
        })
        actualRef.current.value = lastUserValue.current
      }
    }, 100)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <input
      ref={actualRef}
      type={type}
      onInput={handleInput}
      onChange={handleInput}
      placeholder={placeholder}
      className={className}
      
      // Aggressive autofill blocking
      autoComplete="new-password"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      
      // Block form management
      data-lpignore="true"
      data-form-type="other"
      data-1p-ignore="true"
      
      // Additional protection attributes
      name={`input_${Math.random().toString(36).substr(2, 9)}`}
      id={`input_${Math.random().toString(36).substr(2, 9)}`}
      
      {...props}
    />
  )
}))

BulletproofInput.displayName = 'BulletproofInput'

export default BulletproofInput