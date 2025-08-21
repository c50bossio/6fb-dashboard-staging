'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Star, 
  Plus, 
  Minus, 
  Gift, 
  TrendingUp, 
  Sparkles,
  Zap
} from 'lucide-react'

/**
 * AnimatedPointsEffect Component
 * 
 * Provides visual feedback for points transactions with smooth animations
 * Shows floating point changes, sparkle effects, and tier upgrades
 */
export function AnimatedPointsEffect({ 
  children,
  onPointsChange = null,
  showSparkles = true,
  className = ''
}) {
  const [activeAnimations, setActiveAnimations] = useState([])
  const containerRef = useRef(null)
  const animationIdCounter = useRef(0)

  // Trigger points animation
  const triggerPointsAnimation = (pointsChange, type = 'earned', position = null) => {
    const animationId = ++animationIdCounter.current
    
    // Determine position - center if not specified
    const rect = containerRef.current?.getBoundingClientRect()
    const defaultPosition = rect ? {
      x: rect.width / 2,
      y: rect.height / 2
    } : { x: 0, y: 0 }
    
    const animationPosition = position || defaultPosition
    
    const animation = {
      id: animationId,
      pointsChange,
      type,
      position: animationPosition,
      startTime: Date.now(),
      duration: type === 'tier_upgrade' ? 3000 : 2000
    }
    
    setActiveAnimations(prev => [...prev, animation])
    
    // Remove animation after duration
    setTimeout(() => {
      setActiveAnimations(prev => prev.filter(a => a.id !== animationId))
    }, animation.duration)
  }

  // Expose trigger function to parent
  useEffect(() => {
    if (onPointsChange) {
      onPointsChange(triggerPointsAnimation)
    }
  }, [onPointsChange])

  // Get animation icon and color
  const getAnimationDetails = (type, pointsChange) => {
    switch (type) {
      case 'earned':
        return {
          icon: Plus,
          color: 'text-green-500',
          bgColor: 'bg-green-100',
          prefix: '+',
          sparkleColor: 'text-green-400'
        }
      case 'bonus':
        return {
          icon: Sparkles,
          color: 'text-blue-500',
          bgColor: 'bg-blue-100',
          prefix: '+',
          sparkleColor: 'text-blue-400'
        }
      case 'redeemed':
        return {
          icon: Gift,
          color: 'text-red-500',
          bgColor: 'bg-red-100',
          prefix: '-',
          sparkleColor: 'text-red-400'
        }
      case 'tier_upgrade':
        return {
          icon: TrendingUp,
          color: 'text-gold-500',
          bgColor: 'bg-gold-100',
          prefix: '',
          sparkleColor: 'text-gold-400'
        }
      default:
        return {
          icon: Star,
          color: 'text-gray-500',
          bgColor: 'bg-gray-100',
          prefix: pointsChange > 0 ? '+' : '',
          sparkleColor: 'text-gray-400'
        }
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {children}
      
      {/* Active Animations */}
      {activeAnimations.map(animation => {
        const details = getAnimationDetails(animation.type, animation.pointsChange)
        const AnimationIcon = details.icon
        const elapsed = Date.now() - animation.startTime
        const progress = Math.min(elapsed / animation.duration, 1)
        
        // Animation easing
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const fadeOut = 1 - Math.pow(progress, 2)
        
        // Movement calculations
        const translateY = -50 - (easeOut * 60) // Float upward
        const scale = 0.8 + (easeOut * 0.4) // Scale up slightly
        const opacity = fadeOut
        
        return (
          <div
            key={animation.id}
            className="absolute pointer-events-none z-50"
            style={{
              left: animation.position.x,
              top: animation.position.y,
              transform: `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`,
              opacity: opacity
            }}
          >
            {animation.type === 'tier_upgrade' ? (
              // Special tier upgrade animation
              <div className="flex flex-col items-center space-y-2">
                <div className={`p-3 rounded-full ${details.bgColor} shadow-lg border-2 border-gold-300`}>
                  <AnimationIcon className={`h-6 w-6 ${details.color}`} />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gold-700">Tier Upgraded!</p>
                  <p className="text-sm text-gold-600">Congratulations!</p>
                </div>
                
                {/* Sparkle effects for tier upgrade */}
                {showSparkles && [...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${50 + Math.cos(i * 60 * Math.PI / 180) * (20 + easeOut * 30)}%`,
                      top: `${50 + Math.sin(i * 60 * Math.PI / 180) * (20 + easeOut * 30)}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: fadeOut
                    }}
                  >
                    <Sparkles className={`h-4 w-4 ${details.sparkleColor}`} />
                  </div>
                ))}
              </div>
            ) : (
              // Regular points animation
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-full ${details.bgColor} shadow-lg`}>
                  <AnimationIcon className={`h-4 w-4 ${details.color}`} />
                </div>
                <div className={`text-lg font-bold ${details.color}`}>
                  {details.prefix}{Math.abs(animation.pointsChange)}
                </div>
                
                {/* Sparkle effects */}
                {showSparkles && animation.type !== 'redeemed' && [...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      left: `${70 + i * 20 + easeOut * 10}%`,
                      top: `${30 + i * 15 + easeOut * 20}%`,
                      transform: 'translate(-50%, -50%)',
                      opacity: fadeOut * 0.7
                    }}
                  >
                    <Star className={`h-2 w-2 ${details.sparkleColor}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * PointsCounterAnimation Component
 * 
 * Animates the points counter when values change
 */
export function PointsCounterAnimation({ 
  currentPoints, 
  previousPoints = null, 
  duration = 1000,
  className = ''
}) {
  const [displayPoints, setDisplayPoints] = useState(currentPoints)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef(null)

  useEffect(() => {
    if (previousPoints !== null && previousPoints !== currentPoints) {
      setIsAnimating(true)
      const startTime = Date.now()
      const startPoints = previousPoints
      const endPoints = currentPoints
      const pointsDiff = endPoints - startPoints

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4)
        
        const currentDisplayPoints = Math.round(startPoints + (pointsDiff * easeOutQuart))
        setDisplayPoints(currentDisplayPoints)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayPoints(endPoints)
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      setDisplayPoints(currentPoints)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentPoints, previousPoints, duration])

  return (
    <span className={`${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      {displayPoints.toLocaleString()}
    </span>
  )
}

/**
 * TierProgressAnimation Component
 * 
 * Animates tier progress bar changes
 */
export function TierProgressAnimation({ 
  currentProgress, 
  previousProgress = null, 
  duration = 1500,
  className = '',
  barClassName = ''
}) {
  const [displayProgress, setDisplayProgress] = useState(currentProgress)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef(null)

  useEffect(() => {
    if (previousProgress !== null && previousProgress !== currentProgress) {
      setIsAnimating(true)
      const startTime = Date.now()
      const startProgress = previousProgress
      const endProgress = currentProgress
      const progressDiff = endProgress - startProgress

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Smooth easing for progress bar
        const easeOutCubic = 1 - Math.pow(1 - progress, 3)
        
        const currentDisplayProgress = startProgress + (progressDiff * easeOutCubic)
        setDisplayProgress(currentDisplayProgress)

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayProgress(endProgress)
          setIsAnimating(false)
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      setDisplayProgress(currentProgress)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [currentProgress, previousProgress, duration])

  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 ${className}`}>
      <div 
        className={`bg-gradient-to-r from-olive-500 to-moss-500 h-3 rounded-full transition-all duration-300 ${barClassName} ${
          isAnimating ? 'animate-pulse' : ''
        }`}
        style={{ 
          width: `${Math.max(0, Math.min(100, displayProgress))}%`,
          transition: isAnimating ? 'none' : 'width 0.3s ease-out'
        }}
      >
        {/* Shimmer effect during animation */}
        {isAnimating && (
          <div className="h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        )}
      </div>
    </div>
  )
}

/**
 * PulseEffect Component
 * 
 * Creates a pulsing effect for highlighting elements
 */
export function PulseEffect({ 
  children, 
  active = false, 
  color = 'olive', 
  intensity = 'medium' // 'low', 'medium', 'high'
}) {
  const getColorClass = () => {
    const intensityMap = {
      low: '20',
      medium: '30', 
      high: '40'
    }
    
    const opacity = intensityMap[intensity]
    
    switch (color) {
      case 'gold': return `shadow-gold-500/${opacity}`
      case 'green': return `shadow-green-500/${opacity}`
      case 'blue': return `shadow-blue-500/${opacity}`
      case 'red': return `shadow-red-500/${opacity}`
      case 'olive':
      default: return `shadow-olive-500/${opacity}`
    }
  }

  return (
    <div className={`${active ? `animate-pulse ${getColorClass()} shadow-lg` : ''} transition-all duration-300`}>
      {children}
    </div>
  )
}

export default AnimatedPointsEffect