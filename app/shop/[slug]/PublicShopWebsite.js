'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/Separator'
import { MapPin, Phone, Clock, Star, Calendar, Instagram, Facebook, Twitter } from 'lucide-react'

export default function PublicShopWebsite({ initialData }) {
  const [shopData, setShopData] = useState(initialData)
  const [loading, setLoading] = useState(!initialData)
  const [selectedService, setSelectedService] = useState(null)

  // Fallback data structure
  const defaultData = {
    shop: {
      name: 'Loading...',
      description: '',
      phone: '',
      address: '',
      hours: {},
      social_media: {}
    },
    website_settings: {
      hero_title: '',
      hero_subtitle: '',
      primary_color: '#1a365d',
      secondary_color: '#4a5568',
      show_testimonials: true,
      show_team: true,
      show_services: true,
      custom_css: ''
    },
    services: [],
    team: [],
    testimonials: [],
    gallery_images: []
  }

  useEffect(() => {
    if (!initialData) {
      // This would be called if SSR fails
      console.log('No initial data provided')
    }
  }, [initialData])

  const data = shopData || defaultData
  const { shop, website_settings, services, team, testimonials, gallery_images } = data

  // Custom styling based on shop's brand colors
  const customStyles = {
    '--primary-color': website_settings.primary_color || '#1a365d',
    '--secondary-color': website_settings.secondary_color || '#4a5568'
  }

  const formatHours = (hours) => {
    if (!hours || Object.keys(hours).length === 0) return 'Hours not available'
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    return days.map((day, index) => {
      const dayHours = hours[day]
      if (!dayHours || dayHours.closed) {
        return `${dayNames[index]}: Closed`
      }
      return `${dayNames[index]}: ${dayHours.open} - ${dayHours.close}`
    }).join('\n')
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ))
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
              <h1 className="text-2xl font-bold text-gray-900">{shop.name}</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#services" className="text-gray-600 hover:text-gray-900">Services</a>
              {website_settings.show_team && (
                <a href="#team" className="text-gray-600 hover:text-gray-900">Team</a>
              )}
              <a href="#gallery" className="text-gray-600 hover:text-gray-900">Gallery</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900">Contact</a>
            </nav>
            <Button 
              className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
              asChild
            >
              <Link href="/book">Book Now</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {website_settings.hero_title || `Welcome to ${shop.name}`}
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-100">
              {website_settings.hero_subtitle || shop.description || 'Your premier destination for professional grooming'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-[var(--primary-color)] hover:bg-gray-100"
                asChild
              >
                <Link href="/book">Book Appointment</Link>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-[var(--primary-color)]"
                asChild
              >
                <a href="#services">View Services</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      {website_settings.show_services && services.length > 0 && (
        <section id="services" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Professional grooming services tailored to your style and needs
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => (
                <Card key={service.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{service.name}</h3>
                    <Badge variant="secondary">${service.price}</Badge>
                  </div>
                  <p className="text-gray-600 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{service.duration} minutes</span>
                    <Button 
                      size="sm" 
                      className="bg-[var(--primary-color)] hover:bg-[var(--primary-color)]/90"
                      asChild
                    >
                      <Link href={`/book?service=${service.id}`}>Book Now</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team Section */}
      {website_settings.show_team && team.length > 0 && (
        <section id="team" className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Our skilled barbers are passionate about their craft and dedicated to your satisfaction
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {team.map((barber) => (
                <Card key={barber.id} className="p-6 text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-200 overflow-hidden">
                    {barber.profile_picture ? (
                      <Image
                        src={barber.profile_picture}
                        alt={barber.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center text-white font-semibold text-lg">
                        {barber.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{barber.name}</h3>
                  <p className="text-gray-600 mb-4">{barber.bio || 'Professional Barber'}</p>
                  {barber.specialties && barber.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center">
                      {barber.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline">{specialty}</Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {gallery_images && gallery_images.length > 0 && (
        <section id="gallery" className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Gallery</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                See our work and get inspired for your next visit
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {gallery_images.slice(0, 8).map((image, index) => (
                <div key={index} className="aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.alt || `Gallery image ${index + 1}`}
                    width={300}
                    height={300}
                    className="w-full h-full object-cover hover:scale-105 transition-transform"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {website_settings.show_testimonials && testimonials.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
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
                      <p className="text-sm text-gray-500">Verified Customer</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Visit Us</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Contact Information</h3>
              <div className="space-y-4">
                {shop.address && (
                  <div className="flex items-start">
                    <MapPin className="w-5 h-5 text-[var(--primary-color)] mt-1 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Address</p>
                      <p className="text-gray-600">{shop.address}</p>
                    </div>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 text-[var(--primary-color)] mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">Phone</p>
                      <a href={`tel:${shop.phone}`} className="text-[var(--primary-color)] hover:underline">
                        {shop.phone}
                      </a>
                    </div>
                  </div>
                )}
                {shop.hours && Object.keys(shop.hours).length > 0 && (
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-[var(--primary-color)] mt-1 mr-3" />
                    <div>
                      <p className="font-medium text-gray-900 mb-2">Hours</p>
                      <pre className="text-gray-600 text-sm whitespace-pre-line">
                        {formatHours(shop.hours)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Media Links */}
              {shop.social_media && Object.keys(shop.social_media).length > 0 && (
                <div className="mt-8">
                  <h4 className="font-medium text-gray-900 mb-4">Follow Us</h4>
                  <div className="flex space-x-4">
                    {shop.social_media.instagram && (
                      <a
                        href={shop.social_media.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80"
                      >
                        <Instagram className="w-6 h-6" />
                      </a>
                    )}
                    {shop.social_media.facebook && (
                      <a
                        href={shop.social_media.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--primary-color)] hover:text-[var(--primary-color)]/80"
                      >
                        <Facebook className="w-6 h-6" />
                      </a>
                    )}
                    {shop.social_media.twitter && (
                      <a
                        href={shop.social_media.twitter}
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
              <h3 className="text-2xl font-bold mb-4">Ready to Book?</h3>
              <p className="mb-6 text-gray-100">
                Schedule your appointment today and experience the difference of professional grooming.
              </p>
              <Button 
                size="lg" 
                className="w-full bg-white text-[var(--primary-color)] hover:bg-gray-100"
                asChild
              >
                <Link href="/book">Book Your Appointment</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-2">{shop.name}</h3>
            <p className="text-gray-400 mb-4">Professional Grooming Services</p>
            <Separator className="my-4 bg-gray-700" />
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} {shop.name}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}