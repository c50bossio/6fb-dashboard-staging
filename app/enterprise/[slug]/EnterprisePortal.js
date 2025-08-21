'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/Separator'
import { 
  MapPin, 
  Phone, 
  Clock, 
  Star, 
  Calendar, 
  Building2, 
  Users, 
  TrendingUp,
  ChevronRight,
  Instagram,
  Facebook,
  Twitter,
  Mail,
  Globe,
  Award
} from 'lucide-react'

export default function EnterprisePortal({ initialData }) {
  const [enterpriseData, setEnterpriseData] = useState(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [selectedLocation, setSelectedLocation] = useState(null)

  // Fallback data structure
  const defaultData = {
    enterprise: {
      name: 'Loading...',
      description: '',
      website: '',
      contact_email: '',
      social_media: {}
    },
    website_settings: {
      hero_title: '',
      hero_subtitle: '',
      primary_color: '#1a365d',
      secondary_color: '#4a5568',
      hero_image: '',
      show_locations: true,
      show_franchising: true,
      show_testimonials: true,
      custom_css: ''
    },
    locations: [],
    services: [],
    testimonials: [],
    franchise_info: null
  }

  useEffect(() => {
    if (!initialData) {
      console.log('No initial data provided')
    }
  }, [initialData])

  const data = enterpriseData || defaultData
  const { enterprise, website_settings, locations, services, testimonials, franchise_info } = data

  // Custom styling based on enterprise's brand colors
  const customStyles = {
    '--primary-color': website_settings.primary_color || '#1a365d',
    '--secondary-color': website_settings.secondary_color || '#4a5568'
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
  }

  const groupLocationsByRegion = (locations) => {
    const grouped = locations.reduce((acc, location) => {
      const region = location.region || location.state || 'Other'
      if (!acc[region]) {
        acc[region] = []
      }
      acc[region].push(location)
      return acc
    }, {})
    return grouped
  }

  return (
    <div className="min-h-screen bg-gray-50" style={customStyles}>
      {/* Custom CSS injection */}
      {website_settings.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: website_settings.custom_css }} />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-[var(--primary-color)] mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">{enterprise.name}</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#locations" className="text-gray-600 hover:text-gray-900">Locations</a>
              <a href="#services" className="text-gray-600 hover:text-gray-900">Services</a>
              {website_settings.show_franchising && franchise_info && (
                <a href="#franchise" className="text-gray-600 hover:text-gray-900">Franchise</a>
              )}
              <a href="#about" className="text-gray-600 hover:text-gray-900">About</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
            <Button 
              className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
              asChild
            >
              <Link href="#locations">Find Location</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white overflow-hidden">
        {website_settings.hero_image && (
          <div className="absolute inset-0 z-0">
            <Image
              src={website_settings.hero_image}
              alt="Enterprise hero"
              fill
              className="object-cover opacity-20"
            />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {website_settings.hero_title || `Welcome to ${enterprise.name}`}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100 max-w-3xl mx-auto">
              {website_settings.hero_subtitle || enterprise.description || 'Premium grooming experiences across multiple locations'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-[var(--primary-color)] hover:bg-gray-100"
                asChild
              >
                <a href="#locations">Find a Location</a>
              </Button>
              {website_settings.show_franchising && franchise_info && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white hover:text-[var(--primary-color)]"
                  asChild
                >
                  <a href="#franchise">Franchise Opportunities</a>
                </Button>
              )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{locations.length}</div>
                <div className="text-gray-100">Locations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {locations.reduce((total, loc) => total + (loc.staff_count || 0), 0)}+
                </div>
                <div className="text-gray-100">Professional Barbers</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {new Date().getFullYear() - (enterprise.founded_year || 2020)}+
                </div>
                <div className="text-gray-100">Years of Excellence</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Locations Section */}
      {website_settings.show_locations && locations.length > 0 && (
        <section id="locations" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Locations</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Find the nearest {enterprise.name} location and experience our premium services
              </p>
            </div>

            {/* Group locations by region */}
            {Object.entries(groupLocationsByRegion(locations)).map(([region, regionLocations]) => (
              <div key={region} className="mb-12">
                <h3 className="text-2xl font-semibold text-gray-800 mb-6">{region}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regionLocations.map((location) => (
                    <Card key={location.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-xl font-semibold text-gray-900">{location.name}</h4>
                        {location.is_flagship && (
                          <Badge variant="secondary" className="bg-[var(--primary-color)] text-white">
                            <Award className="w-3 h-3 mr-1" />
                            Flagship
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-start text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-[var(--primary-color)] mt-0.5 mr-2 flex-shrink-0" />
                          <span>{location.address}</span>
                        </div>
                        
                        {location.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-[var(--primary-color)] mr-2" />
                            <a href={`tel:${location.phone}`} className="hover:text-[var(--primary-color)]">
                              {location.phone}
                            </a>
                          </div>
                        )}

                        {location.hours && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-[var(--primary-color)] mr-2" />
                            <span>Open Today</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
                          asChild
                        >
                          <Link href={`/shop/${location.slug}`}>
                            Visit Shop
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                        >
                          <Link href={`/book?location=${location.id}`}>Book Now</Link>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services Section */}
      {services.length > 0 && (
        <section id="services" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Professional grooming services available across all our locations
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.slice(0, 6).map((service) => (
                <Card key={service.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
                    <Badge variant="secondary">From ${service.starting_price || service.price}</Badge>
                  </div>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{service.duration} minutes</span>
                    <Button 
                      size="sm" 
                      className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
                      asChild
                    >
                      <a href="#locations">Find Location</a>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Franchise Section */}
      {website_settings.show_franchising && franchise_info && (
        <section id="franchise" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  {franchise_info.title || 'Franchise Opportunities'}
                </h2>
                <p className="text-gray-600 mb-6 text-lg">
                  {franchise_info.description || 'Join our growing network of successful barbershop owners.'}
                </p>
                
                <div className="space-y-4 mb-8">
                  {franchise_info.benefits && franchise_info.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start">
                      <TrendingUp className="w-5 h-5 text-[var(--primary-color)] mt-1 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    size="lg" 
                    className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
                    asChild
                  >
                    <a href="#contact">Get Information</a>
                  </Button>
                  {franchise_info.brochure_url && (
                    <Button 
                      size="lg" 
                      variant="outline"
                      asChild
                    >
                      <a href={franchise_info.brochure_url} target="_blank" rel="noopener noreferrer">
                        Download Brochure
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] rounded-lg p-8 text-white">
                <h3 className="text-2xl font-bold mb-6">Franchise Benefits</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Proven Business Model</div>
                      <div className="text-sm text-gray-100">Established systems and processes</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Training & Support</div>
                      <div className="text-sm text-gray-100">Comprehensive training program</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mr-4">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-semibold">Marketing Support</div>
                      <div className="text-sm text-gray-100">National and local marketing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {website_settings.show_testimonials && testimonials.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.slice(0, 6).map((testimonial) => (
                <Card key={testimonial.id} className="p-6">
                  <div className="flex mb-4">
                    {renderStars(testimonial.rating)}
                  </div>
                  <p className="text-gray-600 mb-4">"{testimonial.text}"</p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gray-200 mr-3 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {testimonial.customer_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{testimonial.customer_name}</p>
                      <p className="text-sm text-gray-500">{testimonial.location_name || 'Verified Customer'}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      <section id="about" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About {enterprise.name}</h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
              {enterprise.description || 'We are committed to providing exceptional grooming experiences across all our locations, with skilled professionals and premium services tailored to each client\'s needs.'}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Get in Touch</h3>
              <div className="space-y-4">
                {enterprise.contact_email && (
                  <div className="flex items-center">
                    <Mail className="w-5 h-5 text-[var(--primary-color)] mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Email</p>
                      <a href={`mailto:${enterprise.contact_email}`} className="text-[var(--primary-color)] hover:underline">
                        {enterprise.contact_email}
                      </a>
                    </div>
                  </div>
                )}
                {enterprise.website && (
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 text-[var(--primary-color)] mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Website</p>
                      <a href={enterprise.website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-color)] hover:underline">
                        {enterprise.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              {enterprise.social_media && Object.keys(enterprise.social_media).length > 0 && (
                <div className="mt-8">
                  <h4 className="font-medium text-gray-900 mb-4">Follow Us</h4>
                  <div className="flex space-x-4">
                    {enterprise.social_media.instagram && (
                      <a
                        href={enterprise.social_media.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80"
                      >
                        <Instagram className="w-6 h-6" />
                      </a>
                    )}
                    {enterprise.social_media.facebook && (
                      <a
                        href={enterprise.social_media.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80"
                      >
                        <Facebook className="w-6 h-6" />
                      </a>
                    )}
                    {enterprise.social_media.twitter && (
                      <a
                        href={enterprise.social_media.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80"
                      >
                        <Twitter className="w-6 h-6" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] rounded-lg p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Experience Excellence?</h3>
              <p className="mb-6 text-gray-100">
                Visit any of our {locations.length} locations and discover why we're the premier choice for professional grooming.
              </p>
              <div className="space-y-3">
                <Button 
                  size="lg" 
                  className="w-full bg-white text-[var(--primary-color)] hover:bg-gray-100"
                  asChild
                >
                  <a href="#locations">Find Your Location</a>
                </Button>
                {website_settings.show_franchising && franchise_info && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full border-white text-white hover:bg-white hover:text-[var(--primary-color)]"
                    asChild
                  >
                    <a href="#franchise">Franchise Information</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Building2 className="w-8 h-8 text-[var(--primary-color)] mr-3" />
                <h3 className="text-xl font-bold">{enterprise.name}</h3>
              </div>
              <p className="text-gray-400 mb-4">
                Premium grooming experiences across multiple locations.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <a href="#locations" className="block text-gray-400 hover:text-white">Locations</a>
                <a href="#services" className="block text-gray-400 hover:text-white">Services</a>
                <a href="#about" className="block text-gray-400 hover:text-white">About</a>
                <a href="#contact" className="block text-gray-400 hover:text-white">Contact</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Business</h4>
              <div className="space-y-2">
                {website_settings.show_franchising && (
                  <a href="#franchise" className="block text-gray-400 hover:text-white">Franchise</a>
                )}
                <a href="/careers" className="block text-gray-400 hover:text-white">Careers</a>
                <a href="/support" className="block text-gray-400 hover:text-white">Support</a>
              </div>
            </div>
          </div>
          
          <Separator className="my-8 bg-gray-700" />
          
          <div className="text-center text-gray-400">
            <p>© {new Date().getFullYear()} {enterprise.name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}