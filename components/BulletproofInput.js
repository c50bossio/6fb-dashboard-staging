import { useRef, useEffect, forwardRef, memo } from 'react'

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
  
  useEffect(() => {
    if (actualRef.current && defaultValue) {
      actualRef.current.value = defaultValue
      lastUserValue.current = defaultValue
    }
  }, [defaultValue])
  
  const handleInput = (e) => {
    const newValue = e.target.value
    lastUserValue.current = newValue
    
    if (onChange) {
      onChange(e)
    }
  }
  
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
      
      autoComplete="new-password"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      
      data-lpignore="true"
      data-form-type="other"
      data-1p-ignore="true"
      
      name={`input_${Math.random().toString(36).substr(2, 9)}`}
      id={`input_${Math.random().toString(36).substr(2, 9)}`}
      
      {...props}
    />
  )
}))

BulletproofInput.displayName = 'BulletproofInput'

export default BulletproofInput