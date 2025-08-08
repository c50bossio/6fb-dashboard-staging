'use client'

import { useState, useEffect } from 'react'
import {
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/solid'

export default function BarbershopPreviewPage() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('preview-barbershop')
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        setSettings(parsedSettings)
      } catch (error) {
        console.error('Error parsing settings:', error)
        setSettings(getDefaultSettings())
      }
    } else {
      setSettings(getDefaultSettings())
    }
    setLoading(false)
  }, [])

  const getDefaultSettings = () => ({
    name: 'Your Barbershop',
    tagline: 'Professional Cuts, Modern Style',
    description: 'We provide top-quality barbering services in a modern, welcoming environment.',
    phone: '(555) 123-4567',
    email: 'info@barbershop.com',
    address: '123 Main Street',
    city: 'Your City',
    state: 'CA',
    brand_colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      text: '#1F2937',
      background: '#FFFFFF'
    },
    hero_title: 'Welcome to Your Barbershop',
    hero_subtitle: 'Experience professional barbering at its finest',
    about_text: 'We are passionate about the art of barbering. Our experienced team combines traditional techniques with modern styles to deliver exceptional results every time.'
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading preview...</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Preview Not Available</h1>
          <p className="text-gray-600 mb-6">No preview data found. Please go back to Website Settings and try again.</p>
          <a 
            href="/dashboard/website-settings"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Website Settings
          </a>
        </div>
      </div>
    )
  }

  const brandColors = settings.brand_colors || {
    primary: '#3B82F6',
    secondary: '#1E40AF', 
    accent: '#10B981',
    text: '#1F2937',
    background: '#FFFFFF'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: brandColors.background }}>
      {/* Preview Banner */}
      <div className="bg-gray-900 text-white py-2 px-4 text-center text-sm">
        🔍 <strong>PREVIEW MODE</strong> - This is how your barbershop website will look
        <a 
          href="/dashboard/website-settings"
          className="ml-4 underline hover:text-gray-300"
        >
          ← Back to Settings
        </a>
      </div>

      {/* Header */}
      <header 
        className="py-4 px-6"
        style={{ backgroundColor: brandColors.primary }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.logo_url && (
              <img 
                src={settings.logo_url}
                alt={`${settings.name} logo`}
                className="h-10 w-10 object-contain"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{settings.name}</h1>
              {settings.tagline && (
                <p className="text-sm text-white opacity-90">{settings.tagline}</p>
              )}
            </div>
          </div>
          <button
            className="px-6 py-2 rounded-lg font-semibold text-white border-2 border-white hover:bg-white transition-colors"
            style={{ 
              color: brandColors.primary,
              borderColor: 'white'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'white'
              e.target.style.color = brandColors.primary
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent'
              e.target.style.color = 'white'
            }}
          >
            Book Now
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="py-20 px-6 text-center"
        style={{
          backgroundColor: brandColors.background,
          color: brandColors.text,
          backgroundImage: settings.cover_image_url ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${settings.cover_image_url})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: settings.cover_image_url ? 'white' : brandColors.text }}>
            {settings.hero_title || settings.name || 'Welcome to Your Barbershop'}
          </h2>
          <p className="text-xl mb-8" style={{ color: settings.cover_image_url ? 'white' : brandColors.text }}>
            {settings.hero_subtitle || settings.tagline || 'Professional barbering services'}
          </p>
          <button 
            className="px-8 py-4 rounded-lg font-semibold text-white text-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: brandColors.accent }}
          >
            <CalendarIcon className="h-5 w-5 inline mr-2" />
            Book Appointment
          </button>
        </div>
      </section>

      {/* About Section */}
      {(settings.about_text || settings.description) && (
        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-8" style={{ color: brandColors.text }}>
              About Us
            </h3>
            <p className="text-lg leading-relaxed" style={{ color: brandColors.text }}>
              {settings.about_text || settings.description}
            </p>
          </div>
        </section>
      )}

      {/* Contact & Info Section */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Contact Info */}
          <div className="text-center">
            <PhoneIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Call Us</h4>
            <p className="text-gray-600">{settings.phone || '(555) 123-4567'}</p>
          </div>

          <div className="text-center">
            <MapPinIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Visit Us</h4>
            <p className="text-gray-600">
              {settings.address && `${settings.address}, `}
              {settings.city && `${settings.city}, `}
              {settings.state}
            </p>
          </div>

          <div className="text-center">
            <EnvelopeIcon className="h-8 w-8 mx-auto mb-4" style={{ color: brandColors.primary }} />
            <h4 className="text-xl font-semibold mb-2" style={{ color: brandColors.text }}>Email Us</h4>
            <p className="text-gray-600">{settings.email || 'info@barbershop.com'}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6" style={{ backgroundColor: brandColors.secondary }}>
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-white opacity-90">
            © {new Date().getFullYear()} {settings.name}. All rights reserved.
          </p>
          <p className="text-white opacity-75 text-sm mt-2">
            This is a preview of your barbershop website
          </p>
        </div>
      </footer>
    </div>
  )
}