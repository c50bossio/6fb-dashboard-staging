import { useRef, useEffect, forwardRef, memo } from 'react'

// NUCLEAR SOLUTION: DOM-only input that completely bypasses React state
const NuclearInput = memo(forwardRef(({ 
  type = 'text', 
  defaultValue = '', 
  onBlur, // Only notify parent on blur, not during typing
  placeholder = '', 
  className = 'input-field',
  name,
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const initialValue = useRef(defaultValue)
  const isInitialized = useRef(false)
  
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
  
  // Handle blur event - only time we communicate with parent
  const handleBlur = (e) => {
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
    <input
      ref={actualRef}
      type={type}
      name={name}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      
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
  )
}))

NuclearInput.displayName = 'NuclearInput'

export default NuclearInput