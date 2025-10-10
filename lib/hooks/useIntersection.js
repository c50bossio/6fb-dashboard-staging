'use client'

import { useEffect, useRef, useState } from 'react'

export function useIntersection(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [hasIntersected, setHasIntersected] = useState(false)
  const elementRef = useRef(null)
  const observerRef = useRef(null)

  const {
    threshold = 0,
    rootMargin = '0px',
    root = null,
    triggerOnce = false,
    disabled = false,
  } = options

  useEffect(() => {
    if (disabled) return

    const element = elementRef.current
    if (!element) return

    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isIntersectingNow = entry.isIntersecting

        setIsIntersecting(isIntersectingNow)

        if (isIntersectingNow && !hasIntersected) {
          setHasIntersected(true)
        }

        // If triggerOnce is true, disconnect after first intersection
        if (triggerOnce && isIntersectingNow) {
          observerRef.current?.disconnect()
        }
      },
      {
        threshold,
        rootMargin,
        root,
      }
    )

    observerRef.current.observe(element)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [threshold, rootMargin, root, triggerOnce, disabled, hasIntersected])

  // Reset state when disabled changes
  useEffect(() => {
    if (disabled) {
      setIsIntersecting(false)
      setHasIntersected(false)
    }
  }, [disabled])

  return [elementRef, isIntersecting, hasIntersected]
}