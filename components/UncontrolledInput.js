import { useRef, useEffect, forwardRef, memo } from 'react'

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
  
  useEffect(() => {
    if (!isInitialized.current && actualRef.current) {
      actualRef.current.value = defaultValue
      isInitialized.current = true
    }
  }, [defaultValue])
  
  const handleChange = (e) => {
    if (onChange) {
      onChange(e)
    }
  }
  
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