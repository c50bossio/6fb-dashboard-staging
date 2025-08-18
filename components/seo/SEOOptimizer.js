'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SEOOptimizer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [seoMetrics, setSeoMetrics] = useState(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const trackPageMetrics = async () => {
        const perfObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
            }
            if (entry.entryType === 'first-input') {
            }
          })
        })
        
        try {
          perfObserver.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] })
        } catch (error) {
        }

        let cls = 0
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (!entry.hadRecentInput) {
              cls += entry.value
            }
          })
        }).observe({ entryTypes: ['layout-shift'] })

        const seoChecks = {
          hasTitle: !!document.title && document.title.length > 0,
          titleLength: document.title?.length || 0,
          hasMetaDescription: !!document.querySelector('meta[name="description"]'),
          metaDescriptionLength: document.querySelector('meta[name="description"]')?.getAttribute('content')?.length || 0,
          hasH1: !!document.querySelector('h1'),
          h1Count: document.querySelectorAll('h1').length,
          hasStructuredData: !!document.querySelector('script[type="application/ld+json"]'),
          hasCanonical: !!document.querySelector('link[rel="canonical"]'),
          hasOpenGraph: !!document.querySelector('meta[property^="og:"]'),
          hasTwitterCard: !!document.querySelector('meta[name^="twitter:"]'),
          imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
          internalLinks: document.querySelectorAll('a[href^="/"]').length,
          externalLinks: document.querySelectorAll('a[href^="http"]:not([href*="' + window.location.hostname + '"])').length
        }

        setSeoMetrics(seoChecks)

        if (pathname.includes('/book/')) {
          const barberId = pathname.split('/book/')[1]
          const linkId = searchParams?.get('linkId')
          
          if (linkId) {
            await fetch('/api/analytics/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                linkId: linkId,
                eventType: 'view',
                sessionId: generateSessionId(),
                referrer: document.referrer,
                utmSource: searchParams?.get('utm_source'),
                utmMedium: searchParams?.get('utm_medium'),
                utmCampaign: searchParams?.get('utm_campaign')
              })
            }).catch(console.error)
          }
        }
      }

      setTimeout(trackPageMetrics, 1000)
    }
  }, [pathname, searchParams])

  const generateSessionId = () => {
    let sessionId = sessionStorage.getItem('booking_session_id')
    if (!sessionId) {
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      sessionStorage.setItem('booking_session_id', sessionId)
    }
    return sessionId
  }

  const getSEORecommendations = () => {
    if (!seoMetrics) return []
    
    const recommendations = []
    
    if (!seoMetrics.hasTitle) {
      recommendations.push('Missing page title')
    } else if (seoMetrics.titleLength < 30 || seoMetrics.titleLength > 60) {
      recommendations.push(`Title length (${seoMetrics.titleLength}) should be 30-60 characters`)
    }
    
    if (!seoMetrics.hasMetaDescription) {
      recommendations.push('Missing meta description')
    } else if (seoMetrics.metaDescriptionLength < 120 || seoMetrics.metaDescriptionLength > 160) {
      recommendations.push(`Meta description length (${seoMetrics.metaDescriptionLength}) should be 120-160 characters`)
    }
    
    if (!seoMetrics.hasH1) {
      recommendations.push('Missing H1 tag')
    } else if (seoMetrics.h1Count > 1) {
      recommendations.push(`Multiple H1 tags (${seoMetrics.h1Count}) found, should have only one`)
    }
    
    if (!seoMetrics.hasStructuredData) {
      recommendations.push('Missing structured data (JSON-LD)')
    }
    
    if (!seoMetrics.hasCanonical) {
      recommendations.push('Missing canonical URL')
    }
    
    if (!seoMetrics.hasOpenGraph) {
      recommendations.push('Missing Open Graph meta tags')
    }
    
    if (!seoMetrics.hasTwitterCard) {
      recommendations.push('Missing Twitter Card meta tags')
    }
    
    if (seoMetrics.imagesWithoutAlt > 0) {
      recommendations.push(`${seoMetrics.imagesWithoutAlt} images missing alt text`)
    }
    
    if (seoMetrics.internalLinks < 3) {
      recommendations.push('Consider adding more internal links for better navigation')
    }
    
    return recommendations
  }

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const recommendations = getSEORecommendations()

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-xs z-50">
      <h4 className="font-semibold text-sm text-gray-800 mb-2">SEO Status</h4>
      {seoMetrics ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className={`p-1 rounded ${seoMetrics.hasTitle ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              Title: {seoMetrics.hasTitle ? '✓' : '✗'}
            </div>
            <div className={`p-1 rounded ${seoMetrics.hasMetaDescription ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              Meta: {seoMetrics.hasMetaDescription ? '✓' : '✗'}
            </div>
            <div className={`p-1 rounded ${seoMetrics.hasH1 && seoMetrics.h1Count === 1 ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              H1: {seoMetrics.hasH1 ? (seoMetrics.h1Count === 1 ? '✓' : seoMetrics.h1Count) : '✗'}
            </div>
            <div className={`p-1 rounded ${seoMetrics.hasStructuredData ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              Schema: {seoMetrics.hasStructuredData ? '✓' : '✗'}
            </div>
            <div className={`p-1 rounded ${seoMetrics.hasOpenGraph ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              OG: {seoMetrics.hasOpenGraph ? '✓' : '✗'}
            </div>
            <div className={`p-1 rounded ${seoMetrics.imagesWithoutAlt === 0 ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'}`}>
              Alt: {seoMetrics.imagesWithoutAlt === 0 ? '✓' : seoMetrics.imagesWithoutAlt}
            </div>
          </div>
          
          {recommendations.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-700 mb-1">Issues:</p>
              <ul className="text-xs text-red-600 space-y-1">
                {recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index}>• {rec}</li>
                ))}
                {recommendations.length > 3 && (
                  <li>• +{recommendations.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-gray-500">Analyzing...</div>
      )}
    </div>
  )
}