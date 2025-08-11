'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Head from 'next/head'
import { 
  BuildingStorefrontIcon,
  MapPinIcon,
  StarIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

export default function HomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [barbershops, setBarbershops] = useState([])
  const [error, setError] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
    loadBarbershops()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }

  const loadBarbershops = async () => {
    try {
      setLoading(true)
      // For now, we'll create a mock list of barbershops
      // Later this could be an API call to get all public barbershops
      const mockBarbershops = [
        {
          id: 'demo-barbershop',
          name: '6FB Elite Barbershop',
          tagline: 'Premium Cuts, Professional Service, Unbeatable Style',
          description: 'Experience the finest barbering services in downtown. Professional cuts and styling.',
          slug: 'demo-barbershop',
          logo_url: null,
          cover_image_url: null,
          address: {
            city: 'Downtown',
            state: 'CA',
            full: '123 Main Street, Downtown, CA 90210'
          },
          rating: 4.9,
          total_reviews: 247,
          brand_colors: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            accent: '#10B981'
          },
          website_enabled: true
        }
      ]
      setBarbershops(mockBarbershops)
    } catch (err) {
      console.error('Error loading barbershops:', err)
      setError('Failed to load barbershops')
    } finally {
      setLoading(false)
    }
  }

  const handleVisitSite = (slug) => {
    router.push(`/${slug}`)
  }

  const handleBookNow = (barbershopId) => {
    router.push(`/book/${barbershopId}`)
  }

  // If only one barbershop exists and user is not authenticated, redirect to that barbershop
  useEffect(() => {
    if (!loading && !isAuthenticated && barbershops.length === 1) {
      const mainShop = barbershops[0]
      if (mainShop.website_enabled && mainShop.slug) {
        router.push(`/${mainShop.slug}`)
      }
    }
  }, [loading, isAuthenticated, barbershops, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading barbershops...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadBarbershops}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>6FB Barbershop Directory | Find Professional Barbering Services</title>
        <meta name="description" content="Discover professional barbershops and book appointments online. Quality cuts, expert service, and modern styles." />
        <meta name="keywords" content="barbershop, haircuts, grooming, booking, professional barbers" />
        <meta property="og:title" content="6FB Barbershop Directory" />
        <meta property="og:description" content="Find and book with professional barbershops in your area" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">6FB</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">6FB Barbershops</h1>
                  <p className="text-sm text-gray-500">Professional Barbering Directory</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                    >
                      <Cog6ToothIcon className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                    <button
                      onClick={() => {
                        localStorage.removeItem('access_token')
                        setIsAuthenticated(false)
                      }}
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/register"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Join 6FB
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-blue-600 to-purple-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">
              Find Your Perfect Barbershop
            </h2>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              Discover professional barbershops, browse services, and book appointments online. 
              Quality cuts, expert service, and modern styles await.
            </p>
            
            {barbershops.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => handleVisitSite(barbershops[0].slug)}
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all"
                >
                  Explore Featured Shop
                </button>
                <button
                  onClick={() => handleBookNow(barbershops[0].id)}
                  className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all"
                >
                  Book Appointment
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Barbershops Directory */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Featured Barbershops</h3>
              <p className="text-xl text-gray-600">
                Professional barbering services with online booking
              </p>
            </div>

            {barbershops.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <BuildingStorefrontIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Barbershops Available</h4>
                <p className="text-gray-600 mb-6">
                  We're working on adding barbershops to our directory. Check back soon!
                </p>
                {isAuthenticated && (
                  <Link
                    href="/dashboard/website-settings"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusCircleIcon className="h-4 w-4 mr-2" />
                    Add Your Barbershop
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {barbershops.map((shop) => (
                  <div key={shop.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
                    {/* Cover Image */}
                    <div 
                      className="h-48 bg-gradient-to-br from-gray-200 to-gray-300 relative"
                      style={shop.cover_image_url ? 
                        { backgroundImage: `url(${shop.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } :
                        { backgroundColor: shop.brand_colors?.primary || '#3B82F6' }
                      }
                    >
                      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                      <div className="absolute top-4 left-4 flex items-center space-x-2">
                        {shop.logo_url ? (
                          <img 
                            src={shop.logo_url} 
                            alt={`${shop.name} Logo`}
                            className="h-10 w-10 object-contain bg-white rounded-lg p-1"
                          />
                        ) : (
                          <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-gray-600 font-bold text-lg">
                              {shop.name?.charAt(0) || 'B'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {shop.website_enabled && (
                        <div className="absolute top-4 right-4">
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                            Live
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-6">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{shop.name}</h4>
                      {shop.tagline && (
                        <p className="text-sm font-medium text-blue-600 mb-3">{shop.tagline}</p>
                      )}
                      <p className="text-gray-600 mb-4 line-clamp-2">{shop.description}</p>
                      
                      {/* Location */}
                      {shop.address?.city && (
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <MapPinIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                          <span>{shop.address.city}, {shop.address.state}</span>
                        </div>
                      )}

                      {/* Rating */}
                      {shop.rating && (
                        <div className="flex items-center mb-4">
                          <div className="flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <StarIconSolid
                                key={i}
                                className={`h-4 w-4 ${i < Math.floor(shop.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-gray-600 ml-2 text-sm">{shop.rating}</span>
                          {shop.total_reviews && (
                            <span className="text-gray-400 ml-1 text-sm">({shop.total_reviews})</span>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleVisitSite(shop.slug)}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                          disabled={!shop.website_enabled}
                        >
                          <GlobeAltIcon className="h-4 w-4 mr-2" />
                          Visit Site
                        </button>
                        <button
                          onClick={() => handleBookNow(shop.id)}
                          className="flex-1 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
                          style={{ backgroundColor: shop.brand_colors?.primary || '#3B82F6' }}
                        >
                          <CalendarDaysIcon className="h-4 w-4 mr-2" />
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose 6FB?</h3>
              <p className="text-xl text-gray-600">
                The premier platform for barbershop discovery and booking
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">Easy Booking</h4>
                <p className="text-gray-600">
                  Book appointments instantly with real-time availability and automatic confirmations
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <StarIconSolid className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">Quality Assured</h4>
                <p className="text-gray-600">
                  All barbershops are verified professionals with ratings and reviews from real customers
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <BuildingStorefrontIcon className="h-8 w-8 text-purple-600" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-4">Local Discovery</h4>
                <p className="text-gray-600">
                  Find the perfect barbershop near you with detailed profiles and service information
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of customers who trust 6FB for their barbering needs
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {barbershops.length > 0 && (
                <button
                  onClick={() => handleBookNow(barbershops[0].id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all"
                >
                  Book Your First Appointment
                </button>
              )}
              
              {!isAuthenticated && (
                <Link
                  href="/register"
                  className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-all inline-flex items-center justify-center"
                >
                  Join as a Barber
                  <ArrowRightIcon className="h-5 w-5 ml-2" />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-black text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">6FB</span>
              </div>
              <h5 className="text-xl font-bold mb-2">6FB Barbershops</h5>
              <p className="text-gray-400 mb-6">Professional Barbering Directory</p>
              
              <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-8 text-sm text-gray-400">
                <p>© 2024 6FB Barbershops. All rights reserved.</p>
                <div className="flex space-x-4">
                  <Link href="/privacy" className="hover:text-white">Privacy Policy</Link>
                  <Link href="/terms" className="hover:text-white">Terms of Service</Link>
                  <Link href="/contact" className="hover:text-white">Contact</Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}