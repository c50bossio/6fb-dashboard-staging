'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  PlayIcon,
  HeartIcon,
  ShareIcon,
  TrophyIcon,
  AcademicCapIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import {
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid'
import Link from 'next/link'

export default function IndividualBarberPage() {
  const params = useParams()
  const shopSlug = params.slug
  const barberSlug = params.barber
  
  const [barberData, setBarberData] = useState(null)
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedPortfolioIndex, setSelectedPortfolioIndex] = useState(0)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedService, setSelectedService] = useState(null)

  // Demo data - in production this would be fetched from API
  useEffect(() => {
    const loadBarberData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const demoShopData = {
          name: 'Elite Cuts Barbershop',
          slug: shopSlug,
          address: '123 Main Street, Los Angeles, CA',
          phone: '(555) 123-4567',
          primary_color: '#1E40AF',
          accent_color: '#10B981'
        }
        
        const demoBarberData = {
          id: 'john-martinez',
          slug: barberSlug,
          name: 'John Martinez',
          title: 'Master Barber & Shop Owner',
          display_name: 'John Martinez',
          
          // Hero Section
          hero_image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop',
          hero_title: 'Precision. Passion. Perfection.',
          hero_subtitle: 'Master barber with 12+ years of experience creating styles that define you',
          
          // Professional Info
          bio: `Meet John Martinez, a master barber with over 12 years of experience in the industry. Starting his journey in downtown LA, John has developed a reputation for precision cuts and exceptional client service. His expertise spans from classic traditional cuts to the latest modern styles and trends.

John believes that a great haircut is more than just a service – it's an experience that should leave you feeling confident and looking your absolute best. His attention to detail and commitment to excellence has earned him a loyal clientele and numerous industry recognitions.`,
          
          years_experience: 12,
          specialties: ['Precision Fades', 'Classic Cuts', 'Beard Styling', 'Hot Towel Shaves', 'Modern Styling'],
          certifications: ['Master Barber License (CA)', 'Advanced Cutting Techniques', 'Straight Razor Certified'],
          languages_spoken: ['English', 'Spanish'],
          
          // Awards and Recognition
          awards: [
            {
              title: 'LA\'s Best Barber',
              year: 2023,
              organization: 'City Style Magazine'
            },
            {
              title: 'Master Craftsman Award',
              year: 2022,
              organization: 'California Barber Association'
            },
            {
              title: 'Customer Choice Winner',
              year: 2021,
              organization: 'Yelp Business Awards'
            }
          ],
          
          // Services specific to this barber
          services: [
            {
              id: 1,
              name: 'Signature Precision Cut',
              description: 'John\'s signature style - precision cutting with personalized consultation',
              duration: 45,
              price: 65,
              featured: true
            },
            {
              id: 2,
              name: 'Master Fade',
              description: 'Expert fade techniques with seamless blending',
              duration: 40,
              price: 55,
              featured: true
            },
            {
              id: 3,
              name: 'Classic Gentleman\'s Cut',
              description: 'Timeless traditional styling with modern precision',
              duration: 35,
              price: 45,
              featured: false
            },
            {
              id: 4,
              name: 'Beard Design & Trim',
              description: 'Complete beard styling and maintenance',
              duration: 25,
              price: 35,
              featured: false
            },
            {
              id: 5,
              name: 'Royal Treatment Package',
              description: 'Cut, beard trim, hot towel, and styling - the complete experience',
              duration: 75,
              price: 95,
              featured: true
            }
          ],
          
          // Portfolio
          portfolio: [
            {
              url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
              caption: 'Modern fade with textured top',
              style: 'Modern Fade',
              before_url: null
            },
            {
              url: 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600',
              caption: 'Classic businessman cut',
              style: 'Classic Cut',
              before_url: null
            },
            {
              url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
              caption: 'Precision beard styling',
              style: 'Beard Design',
              before_url: null
            },
            {
              url: 'https://images.unsplash.com/photo-1521490878406-0a3beb9aef9a?w=600',
              caption: 'Creative modern styling',
              style: 'Creative Design',
              before_url: null
            },
            {
              url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600',
              caption: 'Traditional hot towel service',
              style: 'Traditional Service',
              before_url: null
            },
            {
              url: 'https://images.unsplash.com/photo-1622296055836-c5bb6d8b8e0a?w=600',
              caption: 'Sleek professional look',
              style: 'Professional',
              before_url: null
            }
          ],
          
          // Client Reviews
          reviews: [
            {
              id: 1,
              client_name: 'Michael Chen',
              rating: 5,
              comment: 'John is absolutely incredible! I\'ve been going to him for 3 years and he never disappoints. His attention to detail is unmatched.',
              date: '2024-01-15',
              verified: true
            },
            {
              id: 2,
              client_name: 'David Rodriguez',
              rating: 5,
              comment: 'Best barber in LA, hands down. The precision fade he gave me was perfect. Worth every penny!',
              date: '2024-01-12',
              verified: true
            },
            {
              id: 3,
              client_name: 'James Wilson',
              rating: 5,
              comment: 'John transformed my look completely. Professional, skilled, and really listens to what you want.',
              date: '2024-01-08',
              verified: true
            },
            {
              id: 4,
              client_name: 'Alex Thompson',
              rating: 5,
              comment: 'The Royal Treatment package is amazing! Hot towel, perfect cut, and great conversation. Highly recommend!',
              date: '2024-01-05',
              verified: true
            }
          ],
          
          // Stats
          stats: {
            rating: 4.9,
            total_reviews: 187,
            repeat_clients: 85,
            years_at_shop: 8
          },
          
          // Availability (demo)
          next_available: 'Tomorrow at 2:30 PM',
          typical_wait: '1-2 weeks',
          
          // Social
          instagram_handle: '@johnmartinezbarbero',
          personal_phone: null, // Not shown publicly
          
          // Branding (inherits from shop but can have overrides if approved)
          custom_branding: false,
          approved_by_owner: true,
          
          // Page settings
          show_portfolio: true,
          show_reviews: true,
          show_services: true,
          show_availability: true,
          show_contact_info: false // Personal contact hidden
        }
        
        setBarberData(demoBarberData)
        setShopData(demoShopData)
      } catch (error) {
        console.error('Error loading barber data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadBarberData()
  }, [shopSlug, barberSlug])

  const nextPortfolioImage = () => {
    setSelectedPortfolioIndex((prev) => (prev + 1) % barberData.portfolio.length)
  }

  const prevPortfolioImage = () => {
    setSelectedPortfolioIndex((prev) => (prev - 1 + barberData.portfolio.length) % barberData.portfolio.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading barber profile...</p>
        </div>
      </div>
    )
  }

  if (!barberData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Barber Not Found</h1>
          <p className="text-gray-600 mb-6">The barber profile you're looking for doesn't exist.</p>
          <Link 
            href={`/shop/${shopSlug}`}
            className="inline-flex items-center px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to {shopData?.name || 'Barbershop'}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href={`/shop/${shopSlug}`} className="hover:text-gray-900">
              {shopData.name}
            </Link>
            <span>→</span>
            <span className="font-medium text-gray-900">{barberData.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={barberData.hero_image_url}
            alt={barberData.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="text-5xl lg:text-6xl font-bold mb-4 leading-tight">
              {barberData.name}
            </h1>
            <p className="text-xl lg:text-2xl mb-2 text-olive-200">
              {barberData.title}
            </p>
            <p className="text-3xl lg:text-4xl font-light mb-6 leading-tight">
              {barberData.hero_title}
            </p>
            <p className="text-lg mb-8 text-gray-200 leading-relaxed">
              {barberData.hero_subtitle}
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{barberData.stats.rating}</div>
                <div className="flex justify-center mb-2">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(barberData.stats.rating) ? 'text-yellow-400' : 'text-gray-400'}`}
                    />
                  ))}
                </div>
                <div className="text-sm opacity-80">{barberData.stats.total_reviews} Reviews</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{barberData.years_experience}+</div>
                <div className="text-sm opacity-80">Years Experience</div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => setShowBookingModal(true)}
                className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg"
              >
                Book with {barberData.name.split(' ')[0]}
              </button>
              <Link
                href={`/shop/${shopSlug}`}
                className="px-8 py-4 bg-white bg-opacity-20 backdrop-blur-sm text-white font-semibold rounded-lg transition-all duration-300 hover:bg-opacity-30 border border-white border-opacity-30 text-center"
              >
                View All Barbers
              </Link>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <h3 className="text-white text-lg font-semibold mb-4">Quick Info</h3>
              <div className="space-y-3 text-white text-sm">
                <div className="flex justify-between">
                  <span className="opacity-80">Experience:</span>
                  <span>{barberData.years_experience} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Next Available:</span>
                  <span className="text-green-300">{barberData.next_available}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Typical Wait:</span>
                  <span>{barberData.typical_wait}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Repeat Clients:</span>
                  <span>{barberData.stats.repeat_clients}%</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white border-opacity-20">
                <p className="text-white text-xs opacity-80">
                  Located at {shopData.address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <h2 className="text-4xl font-bold mb-8 text-gray-900">
                Meet {barberData.name.split(' ')[0]}
              </h2>
              
              <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed mb-8">
                {barberData.bio.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="mb-4">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Specialties */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Specialties</h3>
                <div className="flex flex-wrap gap-3">
                  {barberData.specialties.map((specialty) => (
                    <span 
                      key={specialty}
                      className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Certifications & Training</h3>
                <div className="space-y-2">
                  {barberData.certifications.map((cert) => (
                    <div key={cert} className="flex items-center gap-3">
                      <AcademicCapIcon className="h-5 w-5 text-olive-600 flex-shrink-0" />
                      <span className="text-gray-700">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              {/* Awards & Recognition */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 mb-8">
                <h3 className="text-xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
                  <TrophyIcon className="h-6 w-6 text-yellow-600" />
                  Awards & Recognition
                </h3>
                <div className="space-y-4">
                  {barberData.awards.map((award) => (
                    <div key={award.title} className="border-l-4 border-yellow-400 pl-4">
                      <div className="font-semibold text-gray-900">{award.title}</div>
                      <div className="text-sm text-gray-600">{award.organization}</div>
                      <div className="text-sm text-yellow-600 font-medium">{award.year}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Languages */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {barberData.languages_spoken.map((language) => (
                    <span 
                      key={language}
                      className="px-3 py-1 bg-white rounded-lg text-sm text-gray-700 shadow-sm"
                    >
                      {language}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {barberData.show_services && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                {barberData.name.split(' ')[0]}'s Services
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Specialized services crafted with {barberData.years_experience}+ years of expertise
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {barberData.services.map((service) => (
                <div 
                  key={service.id}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
                    {service.featured && (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center text-gray-500 text-sm">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {service.duration} min
                    </div>
                    <div className="text-2xl font-bold text-olive-600">
                      ${service.price}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setSelectedService(service)
                      setShowBookingModal(true)
                    }}
                    className="w-full py-3 bg-olive-600 hover:bg-olive-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Book This Service
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Portfolio Section */}
      {barberData.show_portfolio && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                Portfolio
              </h2>
              <p className="text-lg text-gray-600">
                See the artistry and precision that defines my work
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Featured Image */}
              <div className="lg:col-span-2">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={barberData.portfolio[selectedPortfolioIndex]?.url}
                    alt={barberData.portfolio[selectedPortfolioIndex]?.caption}
                    className="w-full h-96 lg:h-[500px] object-cover"
                  />
                  
                  <button
                    onClick={prevPortfolioImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                  >
                    <ArrowLeftIcon className="h-6 w-6" />
                  </button>
                  
                  <button
                    onClick={nextPortfolioImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
                  >
                    <ArrowRightIcon className="h-6 w-6" />
                  </button>

                  <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg px-4 py-2">
                    <p className="font-medium text-gray-900">
                      {barberData.portfolio[selectedPortfolioIndex]?.caption}
                    </p>
                    <p className="text-sm text-gray-600">
                      {barberData.portfolio[selectedPortfolioIndex]?.style}
                    </p>
                  </div>
                </div>
              </div>

              {/* Thumbnail Grid */}
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                  {barberData.portfolio.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPortfolioIndex(index)}
                      className={`relative rounded-lg overflow-hidden transition-all ${
                        index === selectedPortfolioIndex 
                          ? 'ring-4 ring-indigo-500 shadow-lg' 
                          : 'hover:shadow-md'
                      }`}
                    >
                      <img
                        src={item.url}
                        alt={item.caption}
                        className="w-full h-24 lg:h-32 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all"></div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews Section */}
      {barberData.show_reviews && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                Client Reviews
              </h2>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <StarIconSolid
                      key={i}
                      className={`h-6 w-6 ${i < Math.floor(barberData.stats.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
                <span className="text-2xl font-bold text-gray-900">{barberData.stats.rating}</span>
                <span className="text-gray-600">({barberData.stats.total_reviews} reviews)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {barberData.reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex">
                      {[...Array(review.rating)].map((_, i) => (
                        <StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />
                      ))}
                    </div>
                    {review.verified && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    "{review.comment}"
                  </p>
                  
                  <div className="border-t pt-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900">{review.client_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(review.date).toLocaleDateString()}
                      </p>
                    </div>
                    <HeartIcon className="h-5 w-5 text-red-400" />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <button className="px-8 py-3 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
                View All {barberData.stats.total_reviews} Reviews
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Contact & Booking Section */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience the Difference?
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Book your appointment with {barberData.name.split(' ')[0]} and join the hundreds of satisfied clients who trust their style to a true professional.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-gray-800 rounded-xl p-6">
              <MapPinIcon className="h-8 w-8 text-indigo-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-gray-300">{shopData.address}</p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6">
              <PhoneIcon className="h-8 w-8 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Contact</h3>
              <a href={`tel:${shopData.phone}`} className="text-gray-300 hover:text-white">
                {shopData.phone}
              </a>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowBookingModal(true)}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all text-lg"
            >
              Book with {barberData.name.split(' ')[0]}
            </button>
            <Link
              href={`/shop/${shopSlug}`}
              className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all text-lg"
            >
              Visit Shop Page
            </Link>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Book with {barberData.name}</h3>
              <button
                onClick={() => setShowBookingModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            {selectedService && (
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
                <h4 className="font-semibold text-indigo-900">{selectedService.name}</h4>
                <p className="text-sm text-olive-700">{selectedService.duration} min • ${selectedService.price}</p>
              </div>
            )}

            <div className="text-center py-8">
              <UserIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">
                Online booking system integration would go here
              </p>
              <div className="space-y-3">
                <button className="w-full py-3 bg-olive-600 hover:bg-olive-700 text-white font-medium rounded-lg">
                  Select Time & Date
                </button>
                <button 
                  onClick={() => window.open(`tel:${shopData.phone}`)}
                  className="w-full py-3 border-2 border-olive-600 text-olive-600 hover:bg-indigo-50 font-medium rounded-lg"
                >
                  Call {shopData.phone}
                </button>
                <p className="text-sm text-gray-500">
                  Next available: {barberData.next_available}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}