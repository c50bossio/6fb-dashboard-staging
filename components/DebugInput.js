import { useRef, useEffect, forwardRef, memo } from 'react'

const DebugInput = memo(forwardRef(({ 
  type = 'text', 
  defaultValue = '', 
  onChange, 
  placeholder = '', 
  className = 'input-field',
  autoComplete,
  debugLabel = 'INPUT',
  ...props 
}, ref) => {
  const inputRef = useRef(null)
  const actualRef = ref || inputRef
  const eventCounter = useRef(0)
  const valueHistory = useRef([])
  
  const debugLog = (event, data) => {
    eventCounter.current++
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    const logEntry = {
      counter: eventCounter.current,
      timestamp,
      event,
      ...data
    }
    
    valueHistory.current.push(logEntry)
    
    if (valueHistory.current.length > 20) {
      valueHistory.current = valueHistory.current.slice(-20)
    }
  }
  
  useEffect(() => {
    if (actualRef.current && defaultValue) {
      actualRef.current.value = defaultValue
      debugLog('INIT', {
        defaultValue,
        actualValue: actualRef.current.value,
        matches: defaultValue === actualRef.current.value
      })
    }
  }, [defaultValue])
  
  const setupEventListeners = () => {
    if (!actualRef.current) return
    
    const input = actualRef.current
    
    const handleInput = (e) => {
      debugLog('INPUT', {
        value: e.target.value,
        inputType: e.inputType,
        data: e.data,
        isComposing: e.isComposing,
        selectionStart: e.target.selectionStart,
        selectionEnd: e.target.selectionEnd
      })
      onChange?.(e)
    }
    
    const handleChange = (e) => {
      debugLog('CHANGE', {
        value: e.target.value,
        isTrusted: e.isTrusted
      })
    }
    
    const handleKeyDown = (e) => {
      debugLog('KEYDOWN', {
        key: e.key,
        code: e.code,
        currentValue: e.target.value,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,  
        altKey: e.altKey,
        shiftKey: e.shiftKey
      })
    }
    
    const handleKeyUp = (e) => {
      debugLog('KEYUP', {
        key: e.key,
        value: e.target.value,
        valueChanged: e.target.value !== e.target.defaultValue
      })
    }
    
    const handleFocus = (e) => {
      debugLog('FOCUS', {
        value: e.target.value,
        activeElement: document.activeElement === e.target
      })
    }
    
    const handleBlur = (e) => {
      debugLog('BLUR', {
        value: e.target.value,
        relatedTarget: e.relatedTarget?.tagName
      })
    }
    
    const handlePaste = (e) => {
      debugLog('PASTE', {
        clipboardData: e.clipboardData?.getData('text'),
        currentValue: e.target.value
      })
    }
    
    const handleCut = (e) => {
      debugLog('CUT', {
        currentValue: e.target.value,
        selection: e.target.value.substring(e.target.selectionStart, e.target.selectionEnd)
      })
    }
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          debugLog('MUTATION', {
            oldValue: mutation.oldValue,
            newValue: input.value,
            mutationType: mutation.type
          })
        }
      })
    })
    
    input.addEventListener('input', handleInput)
    input.addEventListener('change', handleChange)
    input.addEventListener('keydown', handleKeyDown)
    input.addEventListener('keyup', handleKeyUp)
    input.addEventListener('focus', handleFocus)
    input.addEventListener('blur', handleBlur)
    input.addEventListener('paste', handlePaste)
    input.addEventListener('cut', handleCut)
    
    observer.observe(input, {
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ['value']
    })
    
    return () => {
      input.removeEventListener('input', handleInput)
      input.removeEventListener('change', handleChange)
      input.removeEventListener('keydown', handleKeyDown)
      input.removeEventListener('keyup', handleKeyUp)
      input.removeEventListener('focus', handleFocus)
      input.removeEventListener('blur', handleBlur)
      input.removeEventListener('paste', handlePaste)
      input.removeEventListener('cut', handleCut)
      observer.disconnect()
    }
  }
  
  useEffect(() => {
    const cleanup = setupEventListeners()
    return cleanup
  }, [])
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (actualRef.current) {
        const currentValue = actualRef.current.value
        const lastEntry = valueHistory.current[valueHistory.current.length - 1]
        
        if (!lastEntry || lastEntry.value !== currentValue) {
          debugLog('PERIODIC_CHECK', {
            value: currentValue,
            unexpectedChange: true,
            lastKnownValue: lastEntry?.value || 'none'
          })
        }
      }
    }, 500) // Check every 500ms
    
    return () => clearInterval(interval)
  }, [])
  
  useEffect(() => {
    window[`debug_${debugLabel.toLowerCase()}`] = {
      getHistory: () => valueHistory.current,
      getCurrentValue: () => actualRef.current?.value,
      clearHistory: () => { valueHistory.current = [] },
      logSummary: () => {
        console.group(`📊 ${debugLabel} Debug Summary`)
        console.log('Event Count:', eventCounter.current)
        console.log('Current Value:', actualRef.current?.value)
        console.log('History:', valueHistory.current)
        console.groupEnd()
      }
    }
  }, [debugLabel])
  
  return (
    <input
      ref={actualRef}
      type={type}
      placeholder={placeholder}
      className={className}
      autoComplete={autoComplete}
      {...props}
    />
  )
}))

DebugInput.displayName = 'DebugInput'

export default DebugInput