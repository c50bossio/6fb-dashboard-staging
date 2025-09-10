'use client'

import { useState, useCallback, forwardRef, useEffect } from 'react'
import Image from 'next/image'
import { useIntersection } from '@/lib/hooks/useIntersection'
import { usePerformanceTracking } from '@/lib/hooks/usePerformanceTracking'

const OptimizedImage = forwardRef(({
  src,
  alt,
  width,
  height,
  className = '',
  fallbackSrc = '/images/placeholder.jpg',
  blurDataURL,
  priority = false,
  quality = 80,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  unoptimized = false,
  onLoadingComplete,
  onError,
  trackPerformance = true,
  variant = 'default', // 'avatar', 'hero', 'thumbnail', 'gallery'
  ...props
}, ref) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [loadStartTime, setLoadStartTime] = useState(null)
  
  const { trackEvent, trackTiming } = usePerformanceTracking('optimized-image')
  
  // Intersection observer for lazy loading
  const [intersectionRef, isIntersecting] = useIntersection({
    threshold: 0.1,
    rootMargin: '100px'
  })

  // Variant-specific configurations
  const getVariantConfig = useCallback((variant) => {
    const configs = {
      avatar: {
        quality: 85,
        sizes: '(max-width: 640px) 64px, 96px',
        className: 'rounded-full',
        objectFit: 'cover'
      },
      hero: {
        quality: 90,
        sizes: '100vw',
        className: 'w-full',
        priority: true
      },
      thumbnail: {
        quality: 75,
        sizes: '(max-width: 640px) 150px, 200px',
        className: 'rounded-lg',
        objectFit: 'cover'
      },
      gallery: {
        quality: 85,
        sizes: '(max-width: 768px) 50vw, 33vw',
        className: 'rounded-lg',
        objectFit: 'cover'
      },
      default: {
        quality: 80,
        sizes: sizes,
        className: '',
        objectFit: 'cover'
      }
    }
    
    return configs[variant] || configs.default
  }, [sizes])

  const variantConfig = getVariantConfig(variant)

  // Handle image load start
  const handleLoadStart = useCallback(() => {
    if (trackPerformance) {
      setLoadStartTime(performance.now())
      trackEvent('image_load_start', {
        src: imgSrc,
        variant,
        width,
        height
      })
    }
  }, [imgSrc, variant, width, height, trackEvent, trackPerformance])

  // Handle successful image load
  const handleLoadingComplete = useCallback((img) => {
    setIsLoading(false)
    setHasError(false)
    
    if (trackPerformance && loadStartTime) {
      const loadTime = performance.now() - loadStartTime
      trackTiming('image_load_duration', loadTime, {
        src: imgSrc,
        variant,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: img.naturalWidth * img.naturalHeight
      })
    }
    
    onLoadingComplete?.(img)
  }, [imgSrc, variant, loadStartTime, trackPerformance, trackTiming, onLoadingComplete])

  // Handle image load error
  const handleError = useCallback((error) => {
    setHasError(true)
    setIsLoading(false)
    
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc)
    }
    
    if (trackPerformance) {
      trackEvent('image_load_error', {
        src: imgSrc,
        variant,
        error: error?.message || 'Unknown error'
      })
    }
    
    onError?.(error)
  }, [imgSrc, fallbackSrc, variant, trackPerformance, trackEvent, onError])

  // Generate blur data URL for better loading experience
  const generateBlurDataURL = useCallback((width, height) => {
    if (blurDataURL) return blurDataURL
    
    // Generate a simple gradient blur placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
      </svg>
    `
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  }, [blurDataURL])

  // Update src when prop changes
  useEffect(() => {
    setImgSrc(src)
    setHasError(false)
    setIsLoading(true)
  }, [src])

  // Combine class names
  const combinedClassName = [
    className,
    variantConfig.className,
    'transition-opacity duration-300',
    isLoading ? 'opacity-80' : 'opacity-100',
    hasError ? 'opacity-50' : ''
  ].filter(Boolean).join(' ')

  // Don't render image until it's in viewport (unless priority)
  const shouldLoad = priority || isIntersecting

  if (!shouldLoad) {
    return (
      <div
        ref={intersectionRef}
        className={`${combinedClassName} bg-gray-200 animate-pulse flex items-center justify-center`}
        style={{ width, height }}
        {...props}
      >
        {/* Loading placeholder */}
        <svg 
          className="w-8 h-8 text-gray-400" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-label="Loading image"
        >
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }

  return (
    <div 
      ref={intersectionRef}
      className="relative overflow-hidden"
      style={{ width, height }}
    >
      <Image
        ref={ref}
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        className={combinedClassName}
        quality={variantConfig.quality || quality}
        sizes={variantConfig.sizes}
        priority={variantConfig.priority || priority}
        placeholder={blurDataURL || generateBlurDataURL(width, height) ? 'blur' : 'empty'}
        blurDataURL={blurDataURL || generateBlurDataURL(width, height)}
        loading={loading}
        unoptimized={unoptimized}
        style={{
          objectFit: variantConfig.objectFit || objectFit,
          objectPosition: objectPosition,
        }}
        onLoadStart={handleLoadStart}
        onLoad={handleLoadingComplete}
        onError={handleError}
        {...props}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error overlay */}
      {hasError && imgSrc === fallbackSrc && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      )}
    </div>
  )
})

OptimizedImage.displayName = 'OptimizedImage'

// HOC for creating preset image components
export const createImageVariant = (variant, defaultProps = {}) => {
  const ImageVariant = forwardRef((props, ref) => (
    <OptimizedImage
      ref={ref}
      variant={variant}
      {...defaultProps}
      {...props}
    />
  ))
  
  ImageVariant.displayName = `${variant}Image`
  return ImageVariant
}

// Pre-configured components for common use cases
export const AvatarImage = createImageVariant('avatar', {
  width: 96,
  height: 96,
  alt: 'Avatar'
})

export const HeroImage = createImageVariant('hero', {
  alt: 'Hero image',
  priority: true
})

export const ThumbnailImage = createImageVariant('thumbnail', {
  width: 200,
  height: 150,
  alt: 'Thumbnail'
})

export const GalleryImage = createImageVariant('gallery', {
  alt: 'Gallery image'
})

// Utility function to preload critical images
export const preloadImage = (src, options = {}) => {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    
    img.onload = () => resolve(img)
    img.onerror = reject
    
    // Set attributes for better performance
    if (options.sizes) img.sizes = options.sizes
    if (options.srcset) img.srcset = options.srcset
    
    img.src = src
  })
}

// Utility function to generate responsive image URLs
export const generateResponsiveImageUrls = (baseSrc, sizes = [320, 640, 768, 1024, 1280, 1920]) => {
  const urls = {}
  
  sizes.forEach(size => {
    urls[size] = `${baseSrc}?w=${size}&q=80&f=webp`
  })
  
  return urls
}

// Hook for managing image preloading
export const useImagePreloader = (imageSources = []) => {
  const [preloadedImages, setPreloadedImages] = useState(new Set())
  const [isPreloading, setIsPreloading] = useState(false)
  
  const preloadImages = useCallback(async (sources) => {
    if (sources.length === 0) return
    
    setIsPreloading(true)
    
    try {
      const promises = sources.map(src => preloadImage(src))
      await Promise.allSettled(promises)
      
      setPreloadedImages(new Set(sources))
    } catch (error) {
      console.warn('Some images failed to preload:', error)
    } finally {
      setIsPreloading(false)
    }
  }, [])
  
  useEffect(() => {
    if (imageSources.length > 0) {
      preloadImages(imageSources)
    }
  }, [imageSources, preloadImages])
  
  return {
    preloadedImages,
    isPreloading,
    preloadImages,
  }
}

export default OptimizedImage