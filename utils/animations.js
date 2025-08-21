/**
 * Animation Utilities for Enhanced Customer Search & Filter System
 * 
 * Provides smooth, performant animations and transitions for improved UX.
 * Includes stagger effects, entrance/exit animations, and micro-interactions.
 * 
 * Features:
 * - CSS-in-JS animation helpers
 * - Staggered animations for lists
 * - Loading states and skeletons
 * - Micro-interactions
 * - Performance optimized
 * - Accessibility respecting (prefers-reduced-motion)
 * - Configurable timing and easing
 */

/**
 * Animation configuration constants
 */
export const ANIMATION_CONFIG = {
  // Timing
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 500
  },
  
  // Easing curves
  easing: {
    easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
  },
  
  // Stagger timing
  stagger: {
    fast: 50,
    normal: 100,
    slow: 150
  }
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Create CSS keyframes for animations
 */
export function createKeyframes(name, frames) {
  if (typeof document === 'undefined') return
  
  const styleSheet = document.styleSheets[0] || document.createElement('style').sheet
  const keyframesRule = `@keyframes ${name} { ${frames} }`
  
  try {
    styleSheet.insertRule(keyframesRule, styleSheet.cssRules.length)
  } catch (error) {
    console.warn('Failed to create keyframes:', error)
  }
}

/**
 * Fade in animation
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

/**
 * Slide animations
 */
export const slideInFromTop = {
  initial: { opacity: 0, transform: 'translateY(-10px)' },
  animate: { opacity: 1, transform: 'translateY(0)' },
  exit: { opacity: 0, transform: 'translateY(-10px)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

export const slideInFromBottom = {
  initial: { opacity: 0, transform: 'translateY(10px)' },
  animate: { opacity: 1, transform: 'translateY(0)' },
  exit: { opacity: 0, transform: 'translateY(10px)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

export const slideInFromLeft = {
  initial: { opacity: 0, transform: 'translateX(-10px)' },
  animate: { opacity: 1, transform: 'translateX(0)' },
  exit: { opacity: 0, transform: 'translateX(-10px)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

export const slideInFromRight = {
  initial: { opacity: 0, transform: 'translateX(10px)' },
  animate: { opacity: 1, transform: 'translateX(0)' },
  exit: { opacity: 0, transform: 'translateX(10px)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

/**
 * Scale animations
 */
export const scaleIn = {
  initial: { opacity: 0, transform: 'scale(0.95)' },
  animate: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.95)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.normal,
    ease: ANIMATION_CONFIG.easing.easeOut
  }
}

export const scaleInBounce = {
  initial: { opacity: 0, transform: 'scale(0.8)' },
  animate: { opacity: 1, transform: 'scale(1)' },
  exit: { opacity: 0, transform: 'scale(0.8)' },
  transition: {
    duration: ANIMATION_CONFIG.duration.slow,
    ease: ANIMATION_CONFIG.easing.bounce
  }
}

/**
 * Stagger animation helper
 */
export function createStaggerAnimation(baseAnimation, staggerDelay = ANIMATION_CONFIG.stagger.normal) {
  return (index) => ({
    ...baseAnimation,
    transition: {
      ...baseAnimation.transition,
      delay: index * (staggerDelay / 1000) // Convert to seconds
    }
  })
}

/**
 * Loading pulse animation
 */
export const pulse = {
  animate: {
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: ANIMATION_CONFIG.easing.easeInOut
    }
  }
}

/**
 * Skeleton loading animation
 */
export const skeletonShimmer = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

/**
 * CSS classes for common animations (Tailwind CSS compatible)
 */
export const animationClasses = {
  // Entrance animations
  fadeIn: 'animate-in fade-in-0 duration-200',
  slideInFromTop: 'animate-in slide-in-from-top-2 duration-200',
  slideInFromBottom: 'animate-in slide-in-from-bottom-2 duration-200',
  slideInFromLeft: 'animate-in slide-in-from-left-2 duration-200',
  slideInFromRight: 'animate-in slide-in-from-right-2 duration-200',
  scaleIn: 'animate-in zoom-in-95 duration-200',
  
  // Exit animations
  fadeOut: 'animate-out fade-out-0 duration-150',
  slideOutToTop: 'animate-out slide-out-to-top-2 duration-150',
  slideOutToBottom: 'animate-out slide-out-to-bottom-2 duration-150',
  slideOutToLeft: 'animate-out slide-out-to-left-2 duration-150',
  slideOutToRight: 'animate-out slide-out-to-right-2 duration-150',
  scaleOut: 'animate-out zoom-out-95 duration-150',
  
  // Loading states
  pulse: 'animate-pulse',
  spin: 'animate-spin',
  bounce: 'animate-bounce',
  
  // Hover effects
  hoverScale: 'hover:scale-105 transition-transform duration-200',
  hoverGlow: 'hover:shadow-lg transition-shadow duration-200',
  hoverLift: 'hover:-translate-y-1 transition-transform duration-200'
}

/**
 * Create staggered CSS classes
 */
export function createStaggerClasses(baseClass, count, delay = 50) {
  const classes = []
  for (let i = 0; i < count; i++) {
    classes.push(`${baseClass} [animation-delay:${i * delay}ms]`)
  }
  return classes
}

/**
 * React component wrapper for animations
 */
export function AnimatedContainer({ 
  children, 
  animation = 'fadeIn', 
  delay = 0, 
  className = '',
  ...props 
}) {
  const animClass = animationClasses[animation] || animationClasses.fadeIn
  const delayStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {}
  
  return (
    <div 
      className={`${animClass} ${className}`}
      style={delayStyle}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Staggered list animation component
 */
export function StaggeredList({ 
  children, 
  animation = 'slideInFromLeft', 
  staggerDelay = ANIMATION_CONFIG.stagger.normal,
  className = '' 
}) {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedContainer
          key={index}
          animation={animation}
          delay={index * staggerDelay}
        >
          {child}
        </AnimatedContainer>
      ))}
    </div>
  )
}

/**
 * Loading skeleton component
 */
export function LoadingSkeleton({ 
  width = '100%', 
  height = '1rem', 
  className = '',
  count = 1 
}) {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={{ width, height }}
    />
  ))
  
  return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>
}

/**
 * Animated counter component
 */
export function AnimatedCounter({ 
  from = 0, 
  to, 
  duration = 1000, 
  formatter = (n) => n.toLocaleString(),
  className = '' 
}) {
  const [count, setCount] = React.useState(from)
  
  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setCount(to)
      return
    }
    
    const startTime = Date.now()
    const startValue = from
    const endValue = to
    const totalChange = endValue - startValue
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Ease out animation
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      const currentValue = Math.round(startValue + (totalChange * easedProgress))
      
      setCount(currentValue)
      
      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [from, to, duration])
  
  return <span className={className}>{formatter(count)}</span>
}

/**
 * Animated progress bar
 */
export function AnimatedProgressBar({ 
  progress = 0, 
  duration = 1000,
  className = '',
  showPercentage = false 
}) {
  const [animatedProgress, setAnimatedProgress] = React.useState(0)
  
  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setAnimatedProgress(progress)
      return
    }
    
    const startTime = Date.now()
    const startValue = animatedProgress
    const endValue = progress
    const totalChange = endValue - startValue
    
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progressRatio = Math.min(elapsed / duration, 1)
      
      // Ease out animation
      const easedProgress = 1 - Math.pow(1 - progressRatio, 3)
      const currentValue = startValue + (totalChange * easedProgress)
      
      setAnimatedProgress(currentValue)
      
      if (progressRatio < 1) {
        requestAnimationFrame(animate)
      }
    }
    
    requestAnimationFrame(animate)
  }, [progress, duration])
  
  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-olive-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, animatedProgress))}%` }}
        />
      </div>
      {showPercentage && (
        <span className="absolute right-0 top-0 text-xs text-gray-600 mt-1">
          {Math.round(animatedProgress)}%
        </span>
      )}
    </div>
  )
}

/**
 * Micro-interaction helpers
 */
export const microInteractions = {
  // Button press effect
  buttonPress: 'active:scale-95 transition-transform duration-75',
  
  // Card hover effect
  cardHover: 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200',
  
  // Focus ring
  focusRing: 'focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2',
  
  // Smooth transitions
  smoothTransition: 'transition-all duration-200 ease-out',
  
  // Glow effect
  glowEffect: 'hover:shadow-[0_0_20px_rgba(139,_195,_74,_0.3)] transition-shadow duration-300'
}

/**
 * Performance optimization utilities
 */
export function useReducedMotion() {
  const [shouldReduceMotion, setShouldReduceMotion] = React.useState(false)
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setShouldReduceMotion(mediaQuery.matches)
    
    const handler = (event) => setShouldReduceMotion(event.matches)
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])
  
  return shouldReduceMotion
}

/**
 * Intersection Observer hook for scroll animations
 */
export function useInViewAnimation(options = {}) {
  const [ref, setRef] = React.useState(null)
  const [isInView, setIsInView] = React.useState(false)
  
  React.useEffect(() => {
    if (!ref) return
    
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    )
    
    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, options])
  
  return [setRef, isInView]
}

export default {
  ANIMATION_CONFIG,
  animationClasses,
  microInteractions,
  AnimatedContainer,
  StaggeredList,
  LoadingSkeleton,
  AnimatedCounter,
  AnimatedProgressBar,
  useReducedMotion,
  useInViewAnimation,
  createStaggerAnimation,
  createStaggerClasses,
  prefersReducedMotion
}