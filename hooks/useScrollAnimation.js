'use client'

import { useState, useEffect, useRef } from 'react'

export function useScrollAnimation(options = {}) {
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef(null)
  
  const {
    threshold = 0.1,
    triggerOnce = true,
    rootMargin = '0px'
  } = options

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) {
            observer.unobserve(entry.target)
          }
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      {
        threshold,
        rootMargin
      }
    )

    const currentElement = elementRef.current
    if (currentElement) {
      observer.observe(currentElement)
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement)
      }
    }
  }, [threshold, triggerOnce, rootMargin])

  return [elementRef, isVisible]
}

export function useStaggeredAnimation(count, options = {}) {
  const [visibleItems, setVisibleItems] = useState(new Set())
  const elementRefs = useRef([])
  
  const {
    threshold = 0.1,
    staggerDelay = 100,
    triggerOnce = true
  } = options

  useEffect(() => {
    const observers = []
    
    elementRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                setVisibleItems(prev => new Set(prev).add(index))
              }, index * staggerDelay)
              
              if (triggerOnce) {
                observer.unobserve(entry.target)
              }
            } else if (!triggerOnce) {
              setVisibleItems(prev => {
                const newSet = new Set(prev)
                newSet.delete(index)
                return newSet
              })
            }
          },
          { threshold }
        )
        
        observer.observe(ref)
        observers.push(observer)
      }
    })

    return () => {
      observers.forEach(observer => observer.disconnect())
    }
  }, [count, staggerDelay, threshold, triggerOnce])

  const setRef = (index) => (ref) => {
    elementRefs.current[index] = ref
  }

  return [setRef, visibleItems]
}

export const scrollAnimations = {
  fadeInUp: 'transform transition-all duration-700 ease-out translate-y-8 opacity-0',
  fadeInUpVisible: 'transform transition-all duration-700 ease-out translate-y-0 opacity-100',
  
  fadeInLeft: 'transform transition-all duration-700 ease-out -translate-x-8 opacity-0',
  fadeInLeftVisible: 'transform transition-all duration-700 ease-out translate-x-0 opacity-100',
  
  fadeInRight: 'transform transition-all duration-700 ease-out translate-x-8 opacity-0',
  fadeInRightVisible: 'transform transition-all duration-700 ease-out translate-x-0 opacity-100',
  
  scaleIn: 'transform transition-all duration-700 ease-out scale-95 opacity-0',
  scaleInVisible: 'transform transition-all duration-700 ease-out scale-100 opacity-100',
  
  slideInUp: 'transform transition-all duration-700 ease-out translate-y-16 opacity-0',
  slideInUpVisible: 'transform transition-all duration-700 ease-out translate-y-0 opacity-100'
}