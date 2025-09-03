'use client'

import { useEffect } from 'react'

export default function LocalBusinessSchema({ businessData }) {
  useEffect(() => {
    if (!businessData || !businessData.name) return

    // Create structured data for Local Business
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `#business-${businessData.id || 'local'}`,
      "name": businessData.name,
      "description": businessData.description || `${businessData.name} - Professional barbershop services`,
      "url": businessData.website || window?.location?.origin,
      "telephone": businessData.phone,
      "email": businessData.email,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": businessData.address,
        "addressLocality": businessData.city,
        "addressRegion": businessData.state,
        "postalCode": businessData.zip_code,
        "addressCountry": businessData.country
      },
      "geo": businessData.latitude && businessData.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": businessData.latitude,
        "longitude": businessData.longitude
      } : undefined,
      "openingHoursSpecification": businessData.business_hours ? 
        Object.entries(businessData.business_hours)
          .filter(([day, hours]) => hours && !hours.closed)
          .map(([day, hours]) => ({
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": `https://schema.org/${day.charAt(0).toUpperCase() + day.slice(1)}`,
            "opens": hours.open,
            "closes": hours.close
          })) : undefined,
      "priceRange": "$",
      "paymentAccepted": "Cash, Credit Card",
      "currenciesAccepted": "USD",
      "hasMap": businessData.latitude && businessData.longitude ? 
        `https://maps.google.com/?q=${businessData.latitude},${businessData.longitude}` : undefined,
      "sameAs": businessData.social_media ? businessData.social_media.filter(Boolean) : undefined
    }

    // Remove undefined properties
    Object.keys(structuredData).forEach(key => {
      if (structuredData[key] === undefined) {
        delete structuredData[key]
      }
    })

    // Check if script already exists
    let scriptTag = document.querySelector('script[data-schema="local-business"]')
    
    if (!scriptTag) {
      // Create new script tag
      scriptTag = document.createElement('script')
      scriptTag.type = 'application/ld+json'
      scriptTag.setAttribute('data-schema', 'local-business')
      document.head.appendChild(scriptTag)
    }

    // Update script content
    scriptTag.textContent = JSON.stringify(structuredData, null, 2)

    // Cleanup function
    return () => {
      if (scriptTag && scriptTag.parentNode) {
        scriptTag.parentNode.removeChild(scriptTag)
      }
    }
  }, [businessData])

  // This component doesn't render anything visible
  return null
}

// Helper function to generate schema for business services
export function generateServiceSchema(services, businessData) {
  if (!services || !services.length || !businessData) return null

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "provider": {
      "@type": "LocalBusiness",
      "name": businessData.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": businessData.address,
        "addressLocality": businessData.city,
        "addressRegion": businessData.state,
        "postalCode": businessData.zip_code,
        "addressCountry": businessData.country
      }
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": `${businessData.name} Services`,
      "itemListElement": services.map((service, index) => ({
        "@type": "Offer",
        "itemOffered": {
          "@type": "Service",
          "name": service.name,
          "description": service.description || `Professional ${service.name.toLowerCase()} service`,
          "provider": businessData.name
        },
        "price": service.price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "position": index + 1
      }))
    }
  }
}

// Helper function to add business hours schema
export function generateBusinessHoursSchema(businessHours, businessName) {
  if (!businessHours || typeof businessHours !== 'object') return null

  return {
    "@context": "https://schema.org",
    "@type": "OpeningHoursSpecification",
    "description": `Operating hours for ${businessName}`,
    "openingHours": Object.entries(businessHours)
      .filter(([day, hours]) => hours && !hours.closed)
      .map(([day, hours]) => {
        const dayName = day.charAt(0).toUpperCase() + day.slice(1)
        return `${dayName.substring(0, 2)} ${hours.open}-${hours.close}`
      })
      .join(', ')
  }
}