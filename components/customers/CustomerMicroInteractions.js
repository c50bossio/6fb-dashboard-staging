/**
 * Customer Micro-Interactions Component
 * 
 * Provides delightful micro-interactions and hover effects for customer management
 * Enhances user experience with subtle animations and feedback
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { customerDesignTokens, customerUtilityClasses } from './CustomerDesignSystem'

/**
 * Hover elevation effect for cards
 */
export function HoverCard({ 
  children, 
  className = '', 
  elevation = 'medium', // 'subtle', 'medium', 'strong'
  ...props 
}) {
  const elevationClasses = {
    subtle: 'hover:shadow-md hover:-translate-y-0.5',
    medium: 'hover:shadow-lg hover:-translate-y-1',
    strong: 'hover:shadow-xl hover:-translate-y-2'
  }

  return (
    <div 
      className={`
        transition-all duration-200 ease-out cursor-pointer
        ${elevationClasses[elevation]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Interactive button with press effect
 */
export function MicroButton({ 
  children, 
  variant = 'primary', 
  size = 'default',
  icon: Icon = null,
  loading = false,
  disabled = false,
  onClick,
  className = '',
  ...props 
}) {
  const [isPressed, setIsPressed] = useState(false)

  const variants = {
    primary: 'bg-olive-600 hover:bg-olive-700 text-white focus:ring-olive-500',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    warning: 'bg-yellow-600 hover:bg-yellow-700 text-white focus:ring-yellow-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  }

  const sizes = {
    small: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base'
  }

  const handleMouseDown = () => setIsPressed(true)
  const handleMouseUp = () => setIsPressed(false)
  const handleMouseLeave = () => setIsPressed(false)

  return (
    <button
      className={`
        font-semibold rounded-lg transition-all duration-150 ease-out
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        transform active:scale-95
        ${variants[variant]}
        ${sizes[size]}
        ${isPressed ? 'scale-95' : 'scale-100'}
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div className="flex items-center space-x-2">
        {loading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : Icon ? (
          <Icon className="w-4 h-4" />
        ) : null}
        <span>{children}</span>
      </div>
    </button>
  )
}

/**
 * Ripple effect component
 */
export function RippleEffect({ children, className = '', ...props }) {
  const [ripples, setRipples] = useState([])
  const rippleRef = useRef(null)

  const addRipple = (event) => {
    if (!rippleRef.current) return

    const rect = rippleRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const newRipple = {
      id: Date.now(),
      x,
      y,
      size: Math.max(rect.width, rect.height) * 2
    }

    setRipples(prev => [...prev, newRipple])

    // Remove ripple after animation
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 600)
  }

  return (
    <div
      ref={rippleRef}
      className={`relative overflow-hidden ${className}`}
      onClick={addRipple}
      {...props}
    >
      {children}
      
      {/* Ripple elements */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full pointer-events-none animate-ping"
          style={{
            left: ripple.x - ripple.size / 2,
            top: ripple.y - ripple.size / 2,
            width: ripple.size,
            height: ripple.size,
            animationDuration: '600ms'
          }}
        />
      ))}
    </div>
  )
}

/**
 * Magnetic hover effect
 */
export function MagneticHover({ 
  children, 
  intensity = 0.3, 
  className = '',
  ...props 
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const elementRef = useRef(null)

  const handleMouseMove = (e) => {
    if (!elementRef.current) return

    const rect = elementRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = (e.clientX - centerX) * intensity
    const deltaY = (e.clientY - centerY) * intensity

    setPosition({ x: deltaX, y: deltaY })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div
      ref={elementRef}
      className={`transition-transform duration-200 ease-out ${className}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Floating label input with smooth transitions
 */
export function FloatingLabelInput({
  label,
  type = 'text',
  value,
  onChange,
  className = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  const hasValue = value && value.length > 0

  return (
    <div className={`relative ${className}`}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          block w-full px-3 pt-6 pb-2 text-sm border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-olive-500 focus:border-olive-500
          transition-all duration-200 ease-out
          placeholder-transparent
          ${hasValue || isFocused ? 'bg-white' : 'bg-gray-50'}
        `}
        placeholder={label}
        {...props}
      />
      <label
        className={`
          absolute left-3 transition-all duration-200 ease-out pointer-events-none
          ${hasValue || isFocused 
            ? 'top-2 text-xs text-olive-600 font-medium' 
            : 'top-4 text-sm text-gray-500'
          }
        `}
      >
        {label}
      </label>
    </div>
  )
}

/**
 * Tooltip with smooth animations
 */
export function Tooltip({ 
  children, 
  content, 
  position = 'top', // 'top', 'bottom', 'left', 'right'
  delay = 300,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef(null)

  const positions = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  }

  const arrows = {
    top: 'border-t-gray-900 border-l-transparent border-r-transparent border-b-transparent top-full',
    bottom: 'border-b-gray-900 border-l-transparent border-r-transparent border-t-transparent bottom-full',
    left: 'border-l-gray-900 border-t-transparent border-b-transparent border-r-transparent left-full',
    right: 'border-r-gray-900 border-t-transparent border-b-transparent border-l-transparent right-full'
  }

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div className={`
          absolute z-50 ${positions[position]}
          px-3 py-2 text-sm text-white bg-gray-900 rounded-lg
          transition-all duration-200 ease-out
          animate-in fade-in-0 zoom-in-95
        `}>
          {content}
          <div className={`
            absolute w-0 h-0 border-4 ${arrows[position]}
            left-1/2 transform -translate-x-1/2
          `} />
        </div>
      )}
    </div>
  )
}

/**
 * Progress indicator with smooth transitions
 */
export function SmoothProgress({ 
  value, 
  max = 100, 
  showLabel = true,
  color = 'olive',
  size = 'default', // 'small', 'default', 'large'
  className = ''
}) {
  const [animatedValue, setAnimatedValue] = useState(0)

  const colors = {
    olive: 'bg-olive-600',
    green: 'bg-green-600',
    blue: 'bg-blue-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  }

  const sizes = {
    small: 'h-1',
    default: 'h-2',
    large: 'h-3'
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value)
    }, 100)

    return () => clearTimeout(timer)
  }, [value])

  const percentage = Math.min((animatedValue / max) * 100, 100)

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm text-gray-500">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizes[size]}`}>
        <div 
          className={`
            ${colors[color]} ${sizes[size]} rounded-full 
            transition-all duration-500 ease-out
            relative overflow-hidden
          `}
          style={{ width: `${percentage}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>
      </div>
    </div>
  )
}

/**
 * Count up animation
 */
export function CountUp({ 
  end, 
  start = 0, 
  duration = 1000, 
  formatter = (n) => n.toLocaleString(),
  prefix = '',
  suffix = '',
  className = ''
}) {
  const [count, setCount] = useState(start)

  useEffect(() => {
    const startTime = Date.now()
    const totalChange = end - start

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(start + (totalChange * easedProgress))
      
      setCount(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [end, start, duration])

  return (
    <span className={className}>
      {prefix}{formatter(count)}{suffix}
    </span>
  )
}

/**
 * Staggered fade-in for lists
 */
export function StaggeredFadeIn({ 
  children, 
  delay = 100, 
  className = '' 
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className="animate-in fade-in-0 slide-in-from-bottom-2"
          style={{ 
            animationDelay: `${index * delay}ms`,
            animationFillMode: 'both'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  )
}

/**
 * Focus trap for modals and dropdowns
 */
export function FocusTrap({ children, active = true }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!active || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  }, [active])

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  )
}

export default {
  HoverCard,
  MicroButton,
  RippleEffect,
  MagneticHover,
  FloatingLabelInput,
  Tooltip,
  SmoothProgress,
  CountUp,
  StaggeredFadeIn,
  FocusTrap
}