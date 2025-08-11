// SEO utilities for barber booking pages
// Generates metadata, structured data, and SEO optimizations

export function generateBarberMetadata(barber, searchParams = {}) {
  const { name, title, bio, location, specialties, rating, reviewCount, services } = barber
  
  // Extract URL parameters for dynamic content
  const urlServices = searchParams?.services?.split(',') || []
  const urlDiscount = searchParams?.discount
  
  // Generate dynamic title based on services and location
  const serviceText = urlServices.length > 0 
    ? ` - ${urlServices.join(', ')} Services`
    : ` - ${specialties.slice(0, 3).join(', ')}`
  
  const discountText = urlDiscount ? ` | ${urlDiscount}% Off Special Offer` : ''
  
  const pageTitle = `Book ${name}${serviceText} in ${location.city}, ${location.state}${discountText} | 6FB Barbershop`
  
  const description = `Book an appointment with ${name}, ${title} in ${location.city}. ${bio} Specializing in ${specialties.join(', ')}. ${rating} stars (${reviewCount} reviews). Online booking available 24/7.`
  
  // Generate keywords
  const keywords = [
    name.toLowerCase(),
    title.toLowerCase(),
    `${name.toLowerCase()} barber`,
    `barber ${location.city.toLowerCase()}`,
    `barber ${location.state.toLowerCase()}`,
    'book barber appointment',
    'online barber booking',
    'hair cut appointment',
    ...specialties.map(s => s.toLowerCase()),
    ...services.map(s => s.name.toLowerCase()),
    'professional barber',
    'mens haircut',
    'barbershop booking'
  ]
  
  const canonicalUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai'}/book/${barber.id}`
  
  return {
    title: pageTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: '6FB Barbershop Network' }],
    creator: '6FB Barbershop',
    publisher: '6FB Barbershop',
    formatDetection: {
      email: false,
      address: true,
      telephone: true,
    },
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai'),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description,
      url: canonicalUrl,
      siteName: '6FB Barbershop Network',
      images: [
        {
          url: barber.image || '/og-barber-booking.jpg',
          width: 1200,
          height: 630,
          alt: `${name} - ${title} at ${location.name}`,
        },
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: [barber.image || '/og-barber-booking.jpg'],
      creator: '@6FBBarbershop',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      bing: process.env.BING_VERIFICATION,
    },
  }
}

export function generateStructuredData(barber) {
  const { name, title, rating, reviewCount, location, services } = barber
  
  const structuredData = [
    // LocalBusiness Schema
    {
      '@context': 'https://schema.org',
      '@type': 'BarberShop',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barbershop`,
      name: location.name,
      description: `Professional barbershop featuring ${name}, ${title}`,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}`,
      telephone: location.phone,
      email: 'bookings@6fb.ai',
      address: {
        '@type': 'PostalAddress',
        streetAddress: location.address,
        addressLocality: location.city,
        addressRegion: location.state,
        postalCode: location.zipCode,
        addressCountry: 'US'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: 40.7128,  // In production, get real coordinates
        longitude: -74.0060
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount,
        bestRating: 5,
        worstRating: 1
      },
      openingHours: [
        'Mo-Fr 09:00-20:00',
        'Sa 09:00-18:00', 
        'Su 10:00-18:00'
      ],
      priceRange: '$$',
      currenciesAccepted: 'USD',
      paymentAccepted: 'Cash, Credit Card, Debit Card',
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Barbershop Services',
        itemListElement: services.map((service, index) => ({
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: service.name,
            description: service.description || `Professional ${service.name.toLowerCase()} service`,
          },
          price: service.price,
          priceCurrency: 'USD',
          availability: 'InStock',
          validFrom: new Date().toISOString(),
          seller: {
            '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barbershop`
          }
        }))
      },
      employee: {
        '@type': 'Person',
        '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barber`,
        name: name,
        jobTitle: title,
        description: barber.bio,
        worksFor: {
          '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barbershop`
        }
      },
      potentialAction: {
        '@type': 'ReserveAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}`,
          actionPlatform: [
            'http://schema.org/DesktopWebPlatform',
            'http://schema.org/MobileWebPlatform'
          ]
        },
        result: {
          '@type': 'Reservation',
          name: 'Barber Appointment Booking'
        }
      }
    },
    
    // Person Schema for the Barber
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barber`,
      name: name,
      jobTitle: title,
      description: barber.bio,
      image: barber.image,
      telephone: location.phone,
      worksFor: {
        '@type': 'BarberShop',
        '@id': `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}#barbershop`,
        name: location.name
      },
      hasOccupation: {
        '@type': 'Occupation',
        name: 'Barber',
        occupationLocation: {
          '@type': 'City',
          name: location.city,
          containedInPlace: {
            '@type': 'State',
            name: location.state
          }
        }
      },
      knowsAbout: barber.specialties,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: rating,
        reviewCount: reviewCount,
        bestRating: 5
      }
    },

    // BreadcrumbList Schema
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: process.env.NEXT_PUBLIC_APP_URL
        },
        {
          '@type': 'ListItem', 
          position: 2,
          name: 'Book Appointment',
          item: `${process.env.NEXT_PUBLIC_APP_URL}/book`
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${name} - ${title}`,
          item: `${process.env.NEXT_PUBLIC_APP_URL}/book/${barber.id}`
        }
      ]
    },

    // FAQ Schema (common booking questions)
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How do I book an appointment online?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Simply select your preferred services, choose an available time slot, and provide your contact information. You\'ll receive a confirmation email and SMS reminder.'
          }
        },
        {
          '@type': 'Question',
          name: 'Can I cancel or reschedule my appointment?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, you can cancel or reschedule your appointment up to 2 hours before your scheduled time through your booking confirmation email or by calling us.'
          }
        },
        {
          '@type': 'Question',
          name: 'What payment methods are accepted?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'We accept cash, all major credit cards, and contactless payments including Apple Pay and Google Pay.'
          }
        },
        {
          '@type': 'Question',
          name: 'How long does each service take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: `Service times vary: ${services.map(s => `${s.name} takes ${s.duration} minutes`).join(', ')}. Multiple services can be combined in one appointment.`
          }
        }
      ]
    }
  ]

  return structuredData
}

export function generateCanonicalUrl(barberId, searchParams = {}) {
  const baseUrl = `${process.env.NEXT_PUBLIC_APP_URL}/book/${barberId}`
  
  // Only include certain parameters in canonical URL to avoid duplicate content
  const allowedParams = ['services', 'discount']
  const cleanParams = new URLSearchParams()
  
  allowedParams.forEach(param => {
    if (searchParams[param]) {
      cleanParams.set(param, searchParams[param])
    }
  })
  
  return cleanParams.toString() ? `${baseUrl}?${cleanParams.toString()}` : baseUrl
}

export function generatePageTitle(barber, searchParams = {}) {
  const { name, location, specialties } = barber
  const urlServices = searchParams?.services?.split(',') || []
  const urlDiscount = searchParams?.discount
  
  const serviceText = urlServices.length > 0 
    ? urlServices.join(' & ')
    : specialties.slice(0, 2).join(' & ')
  
  const discountText = urlDiscount ? ` - ${urlDiscount}% Off` : ''
  
  return `${serviceText} with ${name} in ${location.city}${discountText}`
}

export function generateMetaDescription(barber, searchParams = {}) {
  const { name, title, location, rating, reviewCount } = barber
  const urlDiscount = searchParams?.discount
  
  const discountText = urlDiscount ? ` Special offer: ${urlDiscount}% off your first visit!` : ''
  
  return `Book ${name}, ${title} in ${location.city}. ${rating} stars, ${reviewCount} reviews. Professional barber services with online booking.${discountText} Book now!`
}

export const seoConfig = {
  siteName: '6FB Barbershop Network',
  defaultTitle: 'Professional Barber Services | Book Online | 6FB',
  titleTemplate: '%s | 6FB Barbershop',
  defaultDescription: 'Book appointments with professional barbers online. Quality cuts, expert service, convenient scheduling.',
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://6fb.ai',
  defaultImage: '/og-default-barber.jpg',
  twitterHandle: '@6FBBarbershop',
  facebookAppId: process.env.FACEBOOK_APP_ID,
}