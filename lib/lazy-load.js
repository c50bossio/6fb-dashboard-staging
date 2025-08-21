import dynamic from 'next/dynamic'
import { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react'

export const LoadingSkeleton = ({ type = 'default' }) => {
  const skeletons = {
    default: (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ),
    card: (
      <div className="animate-pulse">
        <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    ),
    chart: (
      <div className="animate-pulse">
        <div className="bg-gray-200 rounded-lg h-64 w-full"></div>
      </div>
    ),
    table: (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2"></div>
        <div className="h-8 bg-gray-100 rounded mb-1"></div>
        <div className="h-8 bg-gray-100 rounded mb-1"></div>
        <div className="h-8 bg-gray-100 rounded"></div>
      </div>
    ),
    form: (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
      </div>
    )
  }
  
  return skeletons[type] || skeletons.default
}

export const lazyLoad = (importFunc, options = {}) => {
  const {
    loadingComponent = () => <LoadingSkeleton type={options.type} />,
    ssr = false,
    suspense = true
  } = options
  
  if (typeof window === 'undefined' && !ssr) {
    return () => null
  }
  
  const Component = dynamic(importFunc, {
    loading: loadingComponent,
    ssr,
    suspense
  })
  
  return Component
}

export const useLazyLoad = (threshold = 0.1, rootMargin = '50px') => {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const ref = useRef(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    
    if (ref.current) {
      observer.observe(ref.current)
    }
    
    return () => observer.disconnect()
  }, [threshold, rootMargin])
  
  return [ref, isIntersecting]
}

export const usePreload = (importFunc) => {
  const preload = useCallback(() => {
    importFunc()
  }, [importFunc])
  
  return {
    onMouseEnter: preload,
    onFocus: preload,
    onTouchStart: preload
  }
}

export const ResourceHints = () => {
  useEffect(() => {
    const dnsPrefetch = [
      'https://fonts.googleapis.com',
      'https://cdn.jsdelivr.net',
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ]
    
    dnsPrefetch.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'dns-prefetch'
      link.href = url
      document.head.appendChild(link)
    })
    
    const preconnect = [
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      'https://fonts.gstatic.com'
    ]
    
    preconnect.forEach(url => {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = url
      link.crossOrigin = 'anonymous'
      document.head.appendChild(link)
    })
    
    const prefetchRoutes = [
      '/dashboard',
      '/api/health'
    ]
    
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        prefetchRoutes.forEach(route => {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.href = route
          document.head.appendChild(link)
        })
      })
    }
  }, [])
  
  return null
}

export const LazyImage = ({ src, alt, className, priority = false, ...props }) => {
  const [imageSrc, setImageSrc] = useState(null)
  const [imageRef, isIntersecting] = useLazyLoad()
  
  useEffect(() => {
    if (isIntersecting || priority) {
      setImageSrc(src)
    }
  }, [isIntersecting, src, priority])
  
  return (
    <div ref={imageRef} className={`relative ${className}`}>
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={alt}
          className={className}
          loading={priority ? 'eager' : 'lazy'}
          {...props}
        />
      ) : (
        <div className={`${className} bg-gray-200 animate-pulse`} />
      )}
    </div>
  )
}

export const lazyLoadWithRetry = (importFunc, retries = 3, delay = 1000) => {
  return new Promise((resolve, reject) => {
    const attemptLoad = (attemptNum = 0) => {
      importFunc()
        .then(resolve)
        .catch(error => {
          if (attemptNum < retries) {
            setTimeout(() => attemptLoad(attemptNum + 1), delay * (attemptNum + 1))
          } else {
            reject(error)
          }
        })
    }
    attemptLoad()
  })
}

export const ProgressiveEnhancement = ({ 
  fallback, 
  enhanced, 
  enhancementDelay = 0 
}) => {
  const [isEnhanced, setIsEnhanced] = useState(false)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEnhanced(true)
    }, enhancementDelay)
    
    return () => clearTimeout(timer)
  }, [enhancementDelay])
  
  return isEnhanced ? enhanced : fallback
}

export default {
  LoadingSkeleton,
  lazyLoad,
  useLazyLoad,
  usePreload,
  ResourceHints,
  LazyImage,
  lazyLoadWithRetry,
  ProgressiveEnhancement
}