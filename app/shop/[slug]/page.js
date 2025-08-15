'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  StarIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckIcon,
  ArrowRightIcon,
  PlayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  ShareIcon
} from '@heroicons/react/24/outline'
import {
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid'

export default function PublicBarbershopPage() {
  const params = useParams()
  const shopSlug = params.slug
  
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState(null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const [showBookingWidget, setShowBookingWidget] = useState(false)

  useEffect(() => {
    const loadShopData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800))
        
        const demoData = {
          id: 'elite-cuts',
          name: 'Elite Cuts Barbershop',
          tagline: 'Where Style Meets Precision',
          description: 'Premier barbershop offering classic cuts and modern styles in the heart of Los Angeles.',
          slug: shopSlug,
          
          phone: '(555) 123-4567',
          email: 'info@elitecuts.com',
          address: '123 Main Street',
          city: 'Los Angeles',
          state: 'CA',
          zip_code: '90001',
          
          logo_url: '',
          cover_image_url: '',
          primary_color: '#1E40AF',
          secondary_color: '#3B82F6',
          accent_color: '#10B981',
          text_color: '#1F2937',
          background_color: '#FFFFFF',
          heading_font: 'Montserrat',
          body_font: 'Inter',
          
          hero_title: 'Welcome to Elite Cuts',
          hero_subtitle: 'Experience the perfect blend of traditional barbering and modern style',
          hero_cta_text: 'Book Your Appointment',
          about_title: 'About Our Shop',
          about_content: 'With over 15 years of experience, Elite Cuts has been the go-to barbershop for discerning clients who appreciate quality, precision, and style. Our master barbers combine traditional techniques with contemporary trends to deliver exceptional results every time.',
          services_title: 'Our Services',
          services_description: 'From classic cuts to modern styles, we offer a full range of grooming services',
          team_title: 'Meet Our Barbers',
          team_description: 'Our skilled team of professional barbers are here to give you the perfect look',
          
          business_hours: {
            monday: { open: '09:00', close: '19:00' },
            tuesday: { open: '09:00', close: '19:00' },
            wednesday: { open: '09:00', close: '19:00' },
            thursday: { open: '09:00', close: '20:00' },
            friday: { open: '09:00', close: '20:00' },
            saturday: { open: '08:00', close: '18:00' },
            sunday: { open: '10:00', close: '16:00' }
          },
          
          services: [
            {
              id: 1,
              name: 'Classic Haircut',
              description: 'Traditional barber cut with attention to detail',
              duration: 30,
              price: 35,
              category: 'haircut',
              featured: true
            },
            {
              id: 2,
              name: 'Fade Cut',
              description: 'Modern fade with precision blending',
              duration: 45,
              price: 45,
              category: 'haircut',
              featured: true
            },
            {
              id: 3,
              name: 'Beard Trim',
              description: 'Expert beard shaping and styling',
              duration: 20,
              price: 25,
              category: 'beard',
              featured: false
            },
            {
              id: 4,
              name: 'Hot Towel Shave',
              description: 'Traditional straight razor shave experience',
              duration: 40,
              price: 40,
              category: 'shave',
              featured: true
            },
            {
              id: 5,
              name: 'Full Service Package',
              description: 'Cut, beard trim, and styling',
              duration: 60,
              price: 65,
              category: 'combo',
              featured: true
            }
          ],
          
          barbers: [
            {
              id: 1,
              name: 'John Martinez',
              title: 'Master Barber',
              bio: 'With 12 years of experience, John specializes in classic cuts and modern fades.',
              image_url: '',
              slug: 'john-martinez',
              specialties: ['Fade Cuts', 'Beard Styling'],
              rating: 4.9,
              reviews: 156,
              years_experience: 12
            },
            {
              id: 2,
              name: 'Mike Johnson',
              title: 'Senior Stylist',
              bio: 'Creative stylist known for his innovative approaches to modern hair design.',
              image_url: '',
              slug: 'mike-johnson',
              specialties: ['Modern Styles', 'Color'],
              rating: 4.8,
              reviews: 134,
              years_experience: 8
            },
            {
              id: 3,
              name: 'Chris Williams',
              title: 'Barber & Grooming Specialist',
              bio: 'Expert in traditional barbering with a passion for perfect shaves.',
              image_url: '',
              slug: 'chris-williams',
              specialties: ['Hot Towel Shaves', 'Traditional Cuts'],
              rating: 4.9,
              reviews: 98,
              years_experience: 6
            }
          ],
          
          gallery: [
            {
              url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600',
              caption: 'Modern fade cut',
              barber_id: 1
            },
            {
              url: 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600',
              caption: 'Classic styling',
              barber_id: 2
            },
            {
              url: 'https://images.unsplash.com/photo-1521490878406-0a3beb9aef9a?w=600',
              caption: 'Professional beard trim',
              barber_id: 3
            },
            {
              url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
              caption: 'Hot towel service',
              barber_id: 1
            }
          ],
          
          testimonials: [
            {
              id: 1,
              client_name: 'David Chen',
              rating: 5,
              comment: 'Best barbershop in LA! John always knows exactly what I need.',
              date: '2024-01-15',
              barber_id: 1
            },
            {
              id: 2,
              client_name: 'Marcus Rodriguez',
              rating: 5,
              comment: 'Amazing service and attention to detail. Highly recommend!',
              date: '2024-01-10',
              barber_id: 2
            },
            {
              id: 3,
              client_name: 'Alex Thompson',
              rating: 5,
              comment: 'Chris gave me the best shave of my life. Will definitely be back!',
              date: '2024-01-08',
              barber_id: 3
            }
          ],
          
          show_pricing: true,
          show_portfolio: true,
          show_team: true,
          show_testimonials: true,
          enable_online_booking: true,
          booking_widget_position: 'bottom-right',
          
          rating: 4.8,
          total_reviews: 342,
          founded_year: 2010,
          
          instagram_url: 'https://instagram.com/elitecuts',
          facebook_url: 'https://facebook.com/elitecuts',
          google_business_url: 'https://g.page/elitecuts'
        }
        
        setShopData(demoData)
      } catch (error) {
        console.error('Error loading shop data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadShopData()
  }, [shopSlug])

  const formatBusinessHours = (hours) => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    
    return days.map((day, index) => ({
      name: dayNames[index],
      hours: hours[day]?.closed ? 'Closed' : `${hours[day]?.open} - ${hours[day]?.close}`
    }))
  }

  const nextGalleryImage = () => {
    setGalleryIndex((prev) => (prev + 1) % shopData.gallery.length)
  }

  const prevGalleryImage = () => {
    setGalleryIndex((prev) => (prev - 1 + shopData.gallery.length) % shopData.gallery.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading barbershop...</p>
        </div>
      </div>
    )
  }

  if (!shopData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Barbershop Not Found</h1>
          <p className="text-gray-600">The barbershop you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" style={{ 
      fontFamily: shopData.body_font,
      color: shopData.text_color 
    }}>
      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center text-white overflow-hidden"
        style={{ backgroundColor: shopData.primary_color }}
      >
        {/* Background Image Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        
        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            style={{ fontFamily: shopData.heading_font }}
          >
            {shopData.hero_title}
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            {shopData.hero_subtitle}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setShowBookingWidget(true)}
              className="px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
              style={{ backgroundColor: shopData.accent_color }}
            >
              {shopData.hero_cta_text}
            </button>
            <button className="px-8 py-4 text-lg font-semibold bg-white bg-opacity-20 backdrop-blur-sm rounded-lg transition-all duration-300 hover:bg-opacity-30 border border-white border-opacity-30">
              Learn More
            </button>
          </div>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{shopData.rating}</div>
              <div className="flex justify-center mb-2">
                {[...Array(5)].map((_, i) => (
                  <StarIconSolid
                    key={i}
                    className={`h-5 w-5 ${i < Math.floor(shopData.rating) ? 'text-yellow-400' : 'text-gray-400'}`}
                  />
                ))}
              </div>
              <div className="text-sm opacity-80">{shopData.total_reviews} Reviews</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{new Date().getFullYear() - shopData.founded_year}+</div>
              <div className="text-sm opacity-80">Years Experience</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">{shopData.barbers.length}</div>
              <div className="text-sm opacity-80">Expert Barbers</div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 
                className="text-4xl font-bold mb-6"
                style={{ fontFamily: shopData.heading_font, color: shopData.text_color }}
              >
                {shopData.about_title}
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {shopData.about_content}
              </p>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold mb-2" style={{ color: shopData.primary_color }}>
                    500+
                  </div>
                  <div className="text-sm text-gray-600">Happy Clients</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold mb-2" style={{ color: shopData.primary_color }}>
                    15+
                  </div>
                  <div className="text-sm text-gray-600">Years Experience</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <MapPinIcon className="h-5 w-5 text-gray-400" />
                <span className="text-gray-600">
                  {shopData.address}, {shopData.city}, {shopData.state}
                </span>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=600&h=400&fit=crop"
                  alt="Barbershop Interior"
                  className="w-full h-96 object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-lg shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Licensed & Insured</div>
                    <div className="text-sm text-gray-500">Professional Service</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 
              className="text-4xl font-bold mb-6"
              style={{ fontFamily: shopData.heading_font, color: shopData.text_color }}
            >
              {shopData.services_title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {shopData.services_description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {shopData.services.map((service) => (
              <div 
                key={service.id}
                className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                onClick={() => setSelectedService(service)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold">{service.name}</h3>
                  {service.featured && (
                    <span 
                      className="px-3 py-1 text-xs font-medium rounded-full text-white"
                      style={{ backgroundColor: shopData.accent_color }}
                    >
                      Popular
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 mb-4">{service.description}</p>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center text-gray-500 text-sm">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {service.duration} min
                  </div>
                  {shopData.show_pricing && (
                    <div className="text-2xl font-bold" style={{ color: shopData.primary_color }}>
                      ${service.price}
                    </div>
                  )}
                </div>
                
                <button 
                  className="w-full mt-4 py-2 border-2 rounded-lg font-medium transition-colors hover:text-white hover:border-transparent"
                  style={{ 
                    borderColor: shopData.primary_color, 
                    color: shopData.primary_color 
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = shopData.primary_color}
                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      {shopData.show_team && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl font-bold mb-6"
                style={{ fontFamily: shopData.heading_font, color: shopData.text_color }}
              >
                {shopData.team_title}
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {shopData.team_description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {shopData.barbers.map((barber) => (
                <div key={barber.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <div className="relative">
                    <div className="h-64 bg-gray-200 flex items-center justify-center">
                      <UserGroupIcon className="h-16 w-16 text-gray-400" />
                    </div>
                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full shadow">
                      <div className="flex items-center">
                        <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{barber.rating}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-1">{barber.name}</h3>
                    <p className="text-gray-500 mb-3">{barber.title}</p>
                    <p className="text-gray-600 text-sm mb-4">{barber.bio}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {barber.specialties.map((specialty) => (
                        <span 
                          key={specialty}
                          className="px-3 py-1 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${shopData.primary_color}20`,
                            color: shopData.primary_color 
                          }}
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {barber.years_experience} years experience
                      </div>
                      <button 
                        className="px-4 py-2 rounded-lg font-medium text-white transition-all hover:shadow-lg"
                        style={{ backgroundColor: shopData.primary_color }}
                      >
                        Book with {barber.name.split(' ')[0]}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {shopData.show_portfolio && (
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl font-bold mb-6"
                style={{ fontFamily: shopData.heading_font, color: shopData.text_color }}
              >
                Our Work
              </h2>
              <p className="text-lg text-gray-600">
                See the quality and craftsmanship that sets us apart
              </p>
            </div>

            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src={shopData.gallery[galleryIndex]?.url}
                  alt={shopData.gallery[galleryIndex]?.caption}
                  className="w-full h-96 object-cover"
                />
              </div>
              
              <button
                onClick={prevGalleryImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
              >
                <ChevronLeftIcon className="h-6 w-6" />
              </button>
              
              <button
                onClick={nextGalleryImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-3 shadow-lg transition-all"
              >
                <ChevronRightIcon className="h-6 w-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-90 rounded-lg px-4 py-2">
                <p className="text-sm font-medium">{shopData.gallery[galleryIndex]?.caption}</p>
              </div>
            </div>

            <div className="flex justify-center mt-6 gap-2">
              {shopData.gallery.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setGalleryIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === galleryIndex ? 'bg-olive-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {shopData.show_testimonials && (
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 
                className="text-4xl font-bold mb-6"
                style={{ fontFamily: shopData.heading_font, color: shopData.text_color }}
              >
                What Our Clients Say
              </h2>
              <p className="text-lg text-gray-600">
                Don't just take our word for it
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {shopData.testimonials.map((testimonial) => (
                <div key={testimonial.id} className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.comment}"</p>
                  <div className="border-t pt-4">
                    <p className="font-semibold">{testimonial.client_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(testimonial.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact & Hours Section */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-8">Visit Us</h2>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <MapPinIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Address</div>
                    <div className="text-gray-300">
                      {shopData.address}<br />
                      {shopData.city}, {shopData.state} {shopData.zip_code}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <PhoneIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Phone</div>
                    <a href={`tel:${shopData.phone}`} className="text-gray-300 hover:text-white">
                      {shopData.phone}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowBookingWidget(true)}
                  className="w-full py-4 rounded-lg font-semibold text-lg transition-all hover:shadow-lg"
                  style={{ backgroundColor: shopData.accent_color }}
                >
                  Book Appointment Now
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-8">Business Hours</h2>
              
              <div className="space-y-3">
                {formatBusinessHours(shopData.business_hours).map((day) => (
                  <div key={day.name} className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="font-medium">{day.name}</span>
                    <span className="text-gray-300">{day.hours}</span>
                  </div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  {shopData.instagram_url && (
                    <a 
                      href={shopData.instagram_url}
                      className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      📱
                    </a>
                  )}
                  {shopData.facebook_url && (
                    <a 
                      href={shopData.facebook_url}
                      className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      📘
                    </a>
                  )}
                  {shopData.google_business_url && (
                    <a 
                      href={shopData.google_business_url}
                      className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600 transition-colors"
                    >
                      🗺️
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Booking Widget */}
      {shopData.enable_online_booking && shopData.booking_widget_position === 'bottom-right' && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setShowBookingWidget(true)}
            className="bg-green-600 hover:bg-green-700 text-white p-4 rounded-full shadow-lg transition-all hover:shadow-xl animate-pulse"
          >
            <CalendarDaysIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Book Your Appointment</h3>
              <button
                onClick={() => setShowBookingWidget(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="text-center py-8">
              <CalendarDaysIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-6">
                Online booking system integration would go here
              </p>
              <div className="space-y-3">
                <button 
                  className="w-full py-3 rounded-lg font-medium"
                  style={{ backgroundColor: shopData.primary_color, color: 'white' }}
                >
                  Select Service & Time
                </button>
                <button 
                  onClick={() => window.open(`tel:${shopData.phone}`)}
                  className="w-full py-3 border-2 rounded-lg font-medium"
                  style={{ borderColor: shopData.primary_color, color: shopData.primary_color }}
                >
                  Call {shopData.phone}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}