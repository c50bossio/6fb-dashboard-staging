'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Head from 'next/head'
import Link from 'next/link'
import { 
  CalendarDaysIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  ClockIcon,
  CreditCardIcon,
  ArrowRightIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid, CheckIcon } from '@heroicons/react/24/solid'

export default function DynamicBarbershopPage({ params }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [websiteData, setWebsiteData] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { shopSlug } = params

  // Load barbershop data
  useEffect(() => {
    const loadBarbershopData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/barbershop/${shopSlug}/public`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Barbershop not found')
          } else if (response.status === 403) {
            setError('This website is not available')
          } else {
            setError('Failed to load website')
          }
          return
        }

        const { data } = await response.json()
        setWebsiteData(data)
      } catch (err) {
        console.error('Error loading barbershop data:', err)
        setError('Unable to load website')
      } finally {
        setLoading(false)
      }
    }

    const checkAuth = () => {
      const token = localStorage.getItem('access_token')
      setIsAuthenticated(!!token)
    }

    if (shopSlug) {
      loadBarbershopData()
      checkAuth()
    }
  }, [shopSlug])

  const handleQuickBook = (serviceId = null) => {
    const bookingUrl = `/book/${websiteData.id}${serviceId ? `?service=${serviceId}` : ''}`
    router.push(bookingUrl)
  }

  const formatPhoneForHref = (phone) => {
    return phone?.replace(/[^\d]/g, '') || ''
  }

  const getThemeStyles = () => {
    if (!websiteData?.brand_colors) return {}
    
    return {
      primary: websiteData.brand_colors.primary || '#3B82F6',
      secondary: websiteData.brand_colors.secondary || '#1E40AF',
      accent: websiteData.brand_colors.accent || '#10B981',
      text: websiteData.brand_colors.text || '#1F2937',
      background: websiteData.brand_colors.background || '#FFFFFF'
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading website...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !websiteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The barbershop website you\'re looking for doesn\'t exist or is not available.'}</p>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
            <ArrowRightIcon className="h-4 w-4 ml-2" />
          </Link>
        </div>
      </div>
    )
  }

  const theme = getThemeStyles()

  return (
    <>
      <Head>
        <title>{websiteData.seo?.title || `${websiteData.name} | Professional Barbering Services`}</title>
        <meta name="description" content={websiteData.seo?.description || websiteData.description} />
        <meta name="keywords" content={websiteData.seo?.keywords || 'barbershop, haircuts, grooming'} />
        <meta property="og:title" content={websiteData.seo?.title || websiteData.name} />
        <meta property="og:description" content={websiteData.seo?.description || websiteData.description} />
        <meta property="og:type" content="business.business" />
        <meta property="og:image" content={websiteData.logo_url || websiteData.cover_image_url} />
        <link rel="canonical" href={websiteData.seo?.canonical_url} />
        
        {/* Structured Data */}
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BarberShop",
              "name": websiteData.name,
              "description": websiteData.description,
              "telephone": websiteData.phone,
              "email": websiteData.email,
              "address": {
                "@type": "PostalAddress",
                "streetAddress": websiteData.address?.street,
                "addressLocality": websiteData.address?.city,
                "addressRegion": websiteData.address?.state,
                "addressCountry": "US"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": websiteData.rating,
                "reviewCount": websiteData.total_reviews
              },
              "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "Barbering Services",
                "itemListElement": websiteData.services?.map(service => ({
                  "@type": "Offer",
                  "itemOffered": {
                    "@type": "Service",
                    "name": service.name,
                    "description": service.description
                  },
                  "price": service.price,
                  "priceCurrency": "USD"
                })) || []
              }
            })
          }}
        />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: theme.background, color: theme.text }}>
        
        {/* Dynamic Navigation Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50" style={{ backgroundColor: theme.background }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                {websiteData.logo_url ? (
                  <img 
                    src={websiteData.logo_url} 
                    alt={`${websiteData.name} Logo`}
                    className="h-10 w-10 object-contain rounded"
                  />
                ) : (
                  <div 
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: theme.primary }}
                  >
                    <span className="text-white font-bold text-lg">
                      {websiteData.name?.charAt(0) || 'B'}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-bold" style={{ color: theme.text }}>
                    {websiteData.name}
                  </h1>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-6">
                <a href="#services" className="hover:opacity-75 font-medium" style={{ color: theme.text }}>Services</a>
                {websiteData.team_members?.length > 0 && (
                  <a href="#team" className="hover:opacity-75 font-medium" style={{ color: theme.text }}>Team</a>
                )}
                {websiteData.testimonials?.length > 0 && (
                  <a href="#reviews" className="hover:opacity-75 font-medium" style={{ color: theme.text }}>Reviews</a>
                )}
                <a href="#contact" className="hover:opacity-75 font-medium" style={{ color: theme.text }}>Contact</a>
                {isAuthenticated ? (
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 rounded-lg hover:opacity-90 font-medium text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="hover:opacity-75 font-medium"
                    style={{ color: theme.primary }}
                  >
                    Sign In
                  </Link>
                )}
              </div>

              <div className="md:hidden">
                <button className="hover:opacity-75" style={{ color: theme.text }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Hero Section */}
        <section 
          className="relative text-white"
          style={{
            backgroundImage: websiteData.hero?.background_image ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${websiteData.hero.background_image})` : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
            <div className="text-center">
              <h2 className="text-4xl lg:text-6xl font-bold mb-6">
                {websiteData.hero?.title || websiteData.name}
              </h2>
              <p className="text-xl lg:text-2xl mb-8 text-gray-100 max-w-3xl mx-auto">
                {websiteData.hero?.subtitle || websiteData.tagline || websiteData.description}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button
                  onClick={() => handleQuickBook()}
                  className="px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center transition-all transform hover:scale-105 text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  <CalendarDaysIcon className="h-6 w-6 mr-2" />
                  {websiteData.hero?.cta_text || 'Book Appointment'}
                </button>
                
                {websiteData.phone && (
                  <a
                    href={`tel:${formatPhoneForHref(websiteData.phone)}`}
                    className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center justify-center transition-all"
                  >
                    <PhoneIcon className="h-6 w-6 mr-2" />
                    {websiteData.phone}
                  </a>
                )}
              </div>

              {/* Trust Signals */}
              <div className="flex flex-wrap justify-center gap-8 text-sm">
                {websiteData.rating && (
                  <div className="flex items-center">
                    <StarIconSolid className="h-5 w-5 text-yellow-400 mr-1" />
                    <span className="font-semibold">{websiteData.rating}</span>
                    <span className="text-gray-300 ml-1">({websiteData.total_reviews || 0} reviews)</span>
                  </div>
                )}
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  <span>Licensed Professionals</span>
                </div>
                <div className="flex items-center">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-400 mr-2" />
                  <span>Sanitized Equipment</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dynamic Services Section */}
        {websiteData.services && websiteData.services.length > 0 && (
          <section id="services" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h3 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: theme.text }}>Our Services</h3>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Professional barbering services tailored to your individual style and preferences.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {websiteData.services.map((service) => (
                  <div key={service.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-bold" style={{ color: theme.text }}>{service.name}</h4>
                        <div className="text-right">
                          <div className="text-2xl font-bold" style={{ color: theme.primary }}>${service.price}</div>
                          <div className="text-sm text-gray-500">{service.duration} min</div>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-6">{service.description}</p>
                      
                      <button
                        onClick={() => handleQuickBook(service.id)}
                        className="w-full py-3 rounded-lg font-semibold transition-colors text-white"
                        style={{ backgroundColor: theme.primary }}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Team Section */}
        {websiteData.team_members && websiteData.team_members.length > 0 && (
          <section id="team" className="py-20" style={{ backgroundColor: theme.background }}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h3 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: theme.text }}>Our Team</h3>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  Meet our experienced professionals who bring expertise and passion to every service.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {websiteData.team_members.map((member) => (
                  <div key={member.id} className="text-center">
                    {member.profile_image_url ? (
                      <img
                        src={member.profile_image_url}
                        alt={member.name}
                        className="w-48 h-48 rounded-full mx-auto object-cover border-4 border-gray-100 shadow-lg mb-6"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-full mx-auto bg-gray-200 border-4 border-gray-100 shadow-lg mb-6 flex items-center justify-center">
                        <span className="text-4xl font-bold text-gray-400">
                          {member.name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    <h4 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>{member.name}</h4>
                    <p className="font-semibold mb-3" style={{ color: theme.primary }}>{member.title}</p>
                    
                    {member.bio && (
                      <p className="text-gray-600 mb-4">{member.bio}</p>
                    )}
                    
                    {member.specialties && (
                      <p className="text-sm text-gray-500 mb-6">
                        <strong>Specialties:</strong> {member.specialties}
                      </p>
                    )}
                    
                    <button
                      onClick={() => handleQuickBook()}
                      className="px-6 py-3 rounded-lg font-semibold transition-colors text-white"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Book with {member.name.split(' ')[0]}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Dynamic Testimonials Section */}
        {websiteData.testimonials && websiteData.testimonials.length > 0 && (
          <section id="reviews" className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h3 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: theme.text }}>What Our Customers Say</h3>
                <p className="text-xl text-gray-600">
                  Don't just take our word for it - hear from our satisfied customers
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {websiteData.testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="bg-white rounded-xl shadow-lg p-8 border border-gray-100">
                    <div className="flex items-center mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <StarIconSolid
                          key={i}
                          className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                    
                    <blockquote className="text-gray-700 mb-6 italic">
                      "{testimonial.testimonial_text}"
                    </blockquote>
                    
                    <div className="border-t border-gray-100 pt-4">
                      <div className="font-semibold" style={{ color: theme.text }}>{testimonial.customer_name}</div>
                      {testimonial.service_type && (
                        <div className="text-sm text-gray-500">{testimonial.service_type}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* About Section */}
        {websiteData.about?.content && (
          <section className="py-20" style={{ backgroundColor: theme.background }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h3 className="text-3xl lg:text-4xl font-bold mb-8" style={{ color: theme.text }}>
                {websiteData.about.title || 'About Us'}
              </h3>
              <p className="text-xl text-gray-600 leading-relaxed">
                {websiteData.about.content}
              </p>
            </div>
          </section>
        )}

        {/* Contact Section */}
        <section id="contact" className="py-20 text-white" style={{ backgroundColor: theme.primary }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h3 className="text-3xl lg:text-4xl font-bold mb-4">Visit Our Shop</h3>
              <p className="text-xl text-gray-100">
                {websiteData.address?.full || 'Get in touch to schedule your appointment'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Information */}
              <div>
                <h4 className="text-2xl font-bold mb-8">Get In Touch</h4>
                
                <div className="space-y-6">
                  {websiteData.address?.full && (
                    <div className="flex items-start">
                      <MapPinIcon className="h-6 w-6 text-white mt-1 mr-4 flex-shrink-0" style={{ color: theme.accent }} />
                      <div>
                        <p className="font-semibold mb-1">Address</p>
                        <p className="text-gray-100">{websiteData.address.full}</p>
                      </div>
                    </div>
                  )}
                  
                  {websiteData.phone && (
                    <div className="flex items-start">
                      <PhoneIcon className="h-6 w-6 mt-1 mr-4 flex-shrink-0" style={{ color: theme.accent }} />
                      <div>
                        <p className="font-semibold mb-1">Phone</p>
                        <a 
                          href={`tel:${formatPhoneForHref(websiteData.phone)}`}
                          className="text-gray-100 hover:text-white transition-colors"
                        >
                          {websiteData.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {websiteData.email && (
                    <div className="flex items-start">
                      <EnvelopeIcon className="h-6 w-6 mt-1 mr-4 flex-shrink-0" style={{ color: theme.accent }} />
                      <div>
                        <p className="font-semibold mb-1">Email</p>
                        <a 
                          href={`mailto:${websiteData.email}`}
                          className="text-gray-100 hover:text-white transition-colors"
                        >
                          {websiteData.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {websiteData.social_links && Object.keys(websiteData.social_links).length > 0 && (
                  <div className="mt-12">
                    <p className="font-semibold mb-4">Follow Us</p>
                    <div className="flex space-x-4">
                      {Object.entries(websiteData.social_links).map(([platform, url]) => (
                        url && (
                          <a 
                            key={platform}
                            href={url} 
                            className="bg-black bg-opacity-20 hover:bg-opacity-30 p-3 rounded-lg transition-colors capitalize"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {platform}
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Business Hours */}
              {websiteData.business_hours && Object.keys(websiteData.business_hours).length > 0 && (
                <div>
                  <h4 className="text-2xl font-bold mb-8">Hours of Operation</h4>
                  
                  <div className="bg-black bg-opacity-20 rounded-xl p-6">
                    <div className="space-y-4">
                      {Object.entries(websiteData.business_hours).map(([day, hours]) => (
                        <div key={day} className="flex justify-between items-center">
                          <span className="font-semibold capitalize">{day}</span>
                          <span className="text-gray-100">{hours}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white border-opacity-20">
                      <p className="text-center text-gray-100 mb-4">Ready to book?</p>
                      <button
                        onClick={() => handleQuickBook()}
                        className="w-full py-3 rounded-lg font-semibold transition-colors text-white"
                        style={{ backgroundColor: theme.accent }}
                      >
                        Book Your Appointment Now
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              {websiteData.logo_url ? (
                <img 
                  src={websiteData.logo_url} 
                  alt={`${websiteData.name} Logo`}
                  className="h-12 w-12 object-contain mx-auto mb-4"
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: theme.primary }}
                >
                  <span className="text-white font-bold text-xl">
                    {websiteData.name?.charAt(0) || 'B'}
                  </span>
                </div>
              )}
              
              <h5 className="text-xl font-bold mb-2">{websiteData.name}</h5>
              <p className="text-gray-400 mb-6">{websiteData.tagline}</p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-400">
                <p>© 2024 {websiteData.name}. All rights reserved.</p>
                <div className="flex space-x-4">
                  <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}