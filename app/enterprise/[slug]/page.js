'use client'

import {
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  StarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  TrophyIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  GlobeAltIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import {
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function EnterprisePortalPage() {
  const params = useParams()
  const enterpriseSlug = params.slug
  
  const [enterpriseData, setEnterpriseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [filterBy, setFilterBy] = useState('all') // all, rating, distance, availability
  const [mapView, setMapView] = useState(false)
  const [featuredIndex, setFeaturedIndex] = useState(0)

  useEffect(() => {
    const loadEnterpriseData = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const demoData = {
          id: 'elite-group',
          name: 'Elite Barber Group',
          tagline: 'Excellence Across Every Location',
          description: 'Premier barbershop chain with 12 locations throughout Los Angeles, offering consistent quality and exceptional service across the city.',
          slug: enterpriseSlug,
          
          logo_url: '',
          primary_color: '#1E40AF',
          secondary_color: '#3B82F6',
          accent_color: '#10B981',
          
          hero_title: 'Find Your Perfect Barbershop',
          hero_subtitle: 'With 12 locations across Los Angeles, excellence is always nearby',
          about_content: 'Elite Barber Group has been setting the standard for premium grooming services since 2010. Our network of expertly trained barbers and state-of-the-art facilities ensures you receive the same exceptional experience at every location.',
          mission_statement: 'To provide exceptional grooming experiences that make every client look and feel their best, backed by the consistency and reliability of a trusted network.',
          
          total_locations: 12,
          total_barbers: 84,
          total_reviews: 3421,
          avg_rating: 4.8,
          years_established: 2010,
          clients_served: 50000,
          
          locations: [
            {
              id: 1,
              name: 'Elite Cuts Downtown',
              address: '123 Main St',
              city: 'Los Angeles',
              state: 'CA',
              zip: '90001',
              phone: '(555) 123-4567',
              slug: 'downtown',
              rating: 4.9,
              reviews: 456,
              barbers_count: 8,
              distance: 0.5,
              next_available: 'Today 3:30 PM',
              specialties: ['Classic Cuts', 'Fades', 'Beard Styling'],
              image_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400',
              featured: true,
              business_hours: {
                monday: '9:00 AM - 7:00 PM',
                tuesday: '9:00 AM - 7:00 PM',
                wednesday: '9:00 AM - 7:00 PM',
                thursday: '9:00 AM - 8:00 PM',
                friday: '9:00 AM - 8:00 PM',
                saturday: '8:00 AM - 6:00 PM',
                sunday: '10:00 AM - 4:00 PM'
              },
              monthly_bookings: 450
            },
            {
              id: 2,
              name: 'Elite Cuts Beverly Hills',
              address: '456 Rodeo Dr',
              city: 'Beverly Hills',
              state: 'CA',
              zip: '90210',
              phone: '(555) 234-5678',
              slug: 'beverly-hills',
              rating: 4.8,
              reviews: 389,
              barbers_count: 6,
              distance: 2.1,
              next_available: 'Tomorrow 10:00 AM',
              specialties: ['Premium Styling', 'Executive Cuts'],
              image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
              featured: true,
              business_hours: {
                monday: '8:00 AM - 8:00 PM',
                tuesday: '8:00 AM - 8:00 PM',
                wednesday: '8:00 AM - 8:00 PM',
                thursday: '8:00 AM - 9:00 PM',
                friday: '8:00 AM - 9:00 PM',
                saturday: '7:00 AM - 7:00 PM',
                sunday: '9:00 AM - 5:00 PM'
              },
              monthly_bookings: 380
            },
            {
              id: 3,
              name: 'Elite Cuts Hollywood',
              address: '789 Sunset Blvd',
              city: 'Hollywood',
              state: 'CA',
              zip: '90028',
              phone: '(555) 345-6789',
              slug: 'hollywood',
              rating: 4.7,
              reviews: 567,
              barbers_count: 10,
              distance: 1.8,
              next_available: 'Today 5:00 PM',
              specialties: ['Creative Styling', 'Color', 'Celebrity Cuts'],
              image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400',
              featured: true,
              business_hours: {
                monday: '9:00 AM - 9:00 PM',
                tuesday: '9:00 AM - 9:00 PM',
                wednesday: '9:00 AM - 9:00 PM',
                thursday: '9:00 AM - 10:00 PM',
                friday: '9:00 AM - 10:00 PM',
                saturday: '8:00 AM - 8:00 PM',
                sunday: '10:00 AM - 6:00 PM'
              },
              monthly_bookings: 620
            },
            {
              id: 4,
              name: 'Elite Cuts Santa Monica',
              address: '321 Ocean Ave',
              city: 'Santa Monica',
              state: 'CA',
              zip: '90401',
              phone: '(555) 456-7890',
              slug: 'santa-monica',
              rating: 4.8,
              reviews: 298,
              barbers_count: 7,
              distance: 3.2,
              next_available: 'Tomorrow 2:00 PM',
              specialties: ['Beach Styles', 'Casual Cuts'],
              image_url: 'https://images.unsplash.com/photo-1622296055836-c5bb6d8b8e0a?w=400',
              featured: false,
              business_hours: {
                monday: '9:00 AM - 7:00 PM',
                tuesday: '9:00 AM - 7:00 PM',
                wednesday: '9:00 AM - 7:00 PM',
                thursday: '9:00 AM - 8:00 PM',
                friday: '9:00 AM - 8:00 PM',
                saturday: '8:00 AM - 6:00 PM',
                sunday: '10:00 AM - 5:00 PM'
              },
              monthly_bookings: 320
            },
            {
              id: 5,
              name: 'Elite Cuts Westwood',
              address: '654 Westwood Blvd',
              city: 'Westwood',
              state: 'CA',
              zip: '90024',
              phone: '(555) 567-8901',
              slug: 'westwood',
              rating: 4.9,
              reviews: 234,
              barbers_count: 5,
              distance: 2.7,
              next_available: 'Today 4:15 PM',
              specialties: ['Student Discounts', 'Quick Cuts'],
              image_url: 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=400',
              featured: false,
              business_hours: {
                monday: '9:00 AM - 6:00 PM',
                tuesday: '9:00 AM - 6:00 PM',
                wednesday: '9:00 AM - 6:00 PM',
                thursday: '9:00 AM - 7:00 PM',
                friday: '9:00 AM - 7:00 PM',
                saturday: '8:00 AM - 5:00 PM',
                sunday: '11:00 AM - 4:00 PM'
              },
              monthly_bookings: 280
            },
            {
              id: 6,
              name: 'Elite Cuts Pasadena',
              address: '987 Colorado Blvd',
              city: 'Pasadena',
              state: 'CA',
              zip: '91101',
              phone: '(555) 678-9012',
              slug: 'pasadena',
              rating: 4.6,
              reviews: 178,
              barbers_count: 6,
              distance: 4.1,
              next_available: 'Tomorrow 11:30 AM',
              specialties: ['Family Cuts', 'Traditional Styling'],
              image_url: 'https://images.unsplash.com/photo-1521490878406-0a3beb9aef9a?w=400',
              featured: false,
              business_hours: {
                monday: '9:00 AM - 6:00 PM',
                tuesday: '9:00 AM - 6:00 PM',
                wednesday: '9:00 AM - 6:00 PM',
                thursday: '9:00 AM - 7:00 PM',
                friday: '9:00 AM - 7:00 PM',
                saturday: '8:00 AM - 5:00 PM',
                sunday: '10:00 AM - 4:00 PM'
              },
              monthly_bookings: 240
            }
          ],
          
          show_location_map: true,
          enable_online_booking: true,
          enable_location_comparison: true,
          
          instagram_url: 'https://instagram.com/elitebarbergroup',
          facebook_url: 'https://facebook.com/elitebarbergroup',
          
          awards: [
            'Best Barbershop Chain 2023 - LA Weekly',
            'Customer Choice Award 2022 - Yelp',
            'Excellence in Service 2021 - BBB'
          ]
        }
        
        setEnterpriseData(demoData)
      } catch (error) {
        console.error('Error loading enterprise data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadEnterpriseData()
  }, [enterpriseSlug])

  useEffect(() => {
    if (enterpriseData?.locations) {
      const interval = setInterval(() => {
        setFeaturedIndex((prev) => (prev + 1) % 3) // Only rotate through first 3 featured locations
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [enterpriseData])

  const filteredLocations = enterpriseData?.locations?.filter(location => {
    if (!searchQuery) return true
    return (
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.specialties.some(specialty => 
        specialty.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
  }).sort((a, b) => {
    switch (filterBy) {
      case 'rating':
        return b.rating - a.rating
      case 'distance':
        return a.distance - b.distance
      case 'availability':
        return a.next_available.includes('Today') ? -1 : 1
      default:
        return 0
    }
  }) || []

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading enterprise portal...</p>
        </div>
      </div>
    )
  }

  if (!enterpriseData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Enterprise Not Found</h1>
          <p className="text-gray-600">The enterprise portal you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section 
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: enterpriseData.primary_color }}
      >
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent z-10"></div>
          <img
            src="https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1920&h=1080&fit=crop"
            alt="Elite Barber Group"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-6xl lg:text-8xl font-bold text-white mb-6 leading-tight">
            {enterpriseData.name}
          </h1>
          <p className="text-2xl lg:text-3xl text-olive-200 mb-8 font-light">
            {enterpriseData.tagline}
          </p>
          <p className="text-xl text-gray-200 mb-12 max-w-3xl mx-auto leading-relaxed">
            {enterpriseData.hero_subtitle}
          </p>
          
          {/* Enterprise Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{enterpriseData.total_locations}</div>
              <div className="text-olive-200">Locations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{enterpriseData.total_barbers}+</div>
              <div className="text-olive-200">Expert Barbers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{enterpriseData.avg_rating}</div>
              <div className="text-olive-200">Average Rating</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">{(enterpriseData.clients_served/1000).toFixed(0)}K+</div>
              <div className="text-olive-200">Clients Served</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="#locations"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg text-lg"
            >
              Find Nearest Location
            </Link>
            <Link
              href="#about"
              className="px-8 py-4 bg-white bg-opacity-20 backdrop-blur-sm text-white font-semibold rounded-lg transition-all duration-300 hover:bg-opacity-30 border border-white border-opacity-30 text-lg"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-20">
          <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Featured Locations Carousel */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">Featured Locations</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our top-rated locations across Los Angeles
            </p>
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {enterpriseData.locations.filter(loc => loc.featured).map((location, index) => (
                <div 
                  key={location.id}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-500 ${
                    index === featuredIndex ? 'scale-105 ring-4 ring-indigo-500' : 'hover:shadow-2xl'
                  }`}
                >
                  <div className="relative h-48">
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full shadow-lg">
                      <div className="flex items-center">
                        <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="font-semibold">{location.rating}</span>
                      </div>
                    </div>
                    <div className="absolute top-4 left-4 bg-moss-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                      {location.next_available}
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2 text-gray-900">{location.name}</h3>
                    <div className="flex items-center text-gray-600 mb-4">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      <span className="text-sm">{location.address}, {location.city}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {location.specialties.slice(0, 2).map((specialty) => (
                        <span 
                          key={specialty}
                          className="px-3 py-1 bg-indigo-100 text-olive-700 rounded-full text-xs font-medium"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-500">
                        {location.barbers_count} barbers • {location.reviews} reviews
                      </div>
                      <Link
                        href={`/shop/${location.slug}`}
                        className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors text-sm font-medium"
                      >
                        Visit
                        <ArrowRightIcon className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Carousel Controls */}
            <div className="flex justify-center mt-8 gap-2">
              {enterpriseData.locations.filter(loc => loc.featured).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setFeaturedIndex(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === featuredIndex ? 'bg-olive-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6 text-gray-900">
                About Elite Barber Group
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                {enterpriseData.about_content}
              </p>
              
              <div className="bg-gradient-to-r from-indigo-50 to-gold-50 p-6 rounded-xl mb-8">
                <h3 className="text-lg font-semibold mb-3 text-gray-900">Our Mission</h3>
                <p className="text-gray-700 leading-relaxed">
                  {enterpriseData.mission_statement}
                </p>
              </div>

              {/* Awards */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 flex items-center">
                  <TrophyIcon className="h-5 w-5 mr-2 text-amber-800" />
                  Awards & Recognition
                </h3>
                <div className="space-y-2">
                  {enterpriseData.awards.map((award) => (
                    <div key={award} className="flex items-center">
                      <CheckIcon className="h-4 w-4 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700">{award}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&h=400&fit=crop"
                  alt="Elite Barber Group Team"
                  className="w-full h-96 object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-lg shadow-xl">
                <div className="text-center">
                  <div className="text-3xl font-bold text-olive-600 mb-1">
                    {new Date().getFullYear() - enterpriseData.years_established}+
                  </div>
                  <div className="text-sm text-gray-600">Years of Excellence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Location Finder */}
      <section id="locations" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-6 text-gray-900">Find Your Location</h2>
            <p className="text-lg text-gray-600">
              {enterpriseData.total_locations} convenient locations across Los Angeles
            </p>
          </div>

          {/* Search and Filter */}
          <div className="mb-12 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by location, city, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-olive-500"
                >
                  <option value="all">Sort by</option>
                  <option value="rating">Highest Rated</option>
                  <option value="distance">Nearest</option>
                  <option value="availability">Available Today</option>
                </select>
                
                <button
                  onClick={() => setMapView(!mapView)}
                  className={`px-6 py-3 rounded-xl font-medium transition-colors ${
                    mapView 
                      ? 'bg-olive-600 text-white' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {mapView ? 'List View' : 'Map View'}
                </button>
              </div>
            </div>
          </div>

          {/* Map/List Toggle */}
          {mapView ? (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-12">
              <div className="h-96 bg-gray-100 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <GlobeAltIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Interactive map integration would go here</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Google Maps with all {enterpriseData.total_locations} locations marked
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredLocations.map((location) => (
                <div key={location.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                  <div className="relative h-48">
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-full shadow">
                      <div className="flex items-center">
                        <StarIconSolid className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-sm font-medium">{location.rating}</span>
                      </div>
                    </div>
                    <div className="absolute bottom-4 left-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded-full text-sm">
                      {location.distance} mi away
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-bold mb-2 text-gray-900">{location.name}</h3>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-gray-600 text-sm">
                        <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{location.address}, {location.city}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 text-sm">
                        <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>{location.phone}</span>
                      </div>
                      
                      <div className="flex items-center text-gray-600 text-sm">
                        <CalendarDaysIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-green-600 font-medium">{location.next_available}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {location.specialties.slice(0, 3).map((specialty) => (
                        <span 
                          key={specialty}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-500">
                        {location.barbers_count} barbers • {location.reviews} reviews
                      </div>
                      <div className="text-sm text-gray-500">
                        {location.monthly_bookings}/mo bookings
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link
                        href={`/shop/${location.slug}`}
                        className="flex-1 py-2 bg-olive-600 hover:bg-olive-700 text-white text-center rounded-lg transition-colors font-medium"
                      >
                        Visit Shop
                      </Link>
                      <button className="flex-1 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {filteredLocations.length === 0 && searchQuery && (
            <div className="text-center py-12">
              <BuildingStorefrontIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search or filter criteria
              </p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setFilterBy('all')
                }}
                className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            Experience Elite Service Today
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands of satisfied clients who trust Elite Barber Group for their grooming needs. 
            Find your nearest location and book your appointment today.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="h-16 w-16 bg-olive-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Convenient Locations</h3>
              <p className="text-gray-400">Find us throughout Los Angeles</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarDaysIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Booking</h3>
              <p className="text-gray-400">Online scheduling available</p>
            </div>
            
            <div className="text-center">
              <div className="h-16 w-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <StarIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quality Guaranteed</h3>
              <p className="text-gray-400">Consistent excellence across all locations</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link
              href="#locations"
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all text-lg"
            >
              Find & Book Now
            </Link>
            <button className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-all text-lg">
              Call (555) 123-CUTS
            </button>
          </div>
        </div>
      </section>

      {/* Location Selection Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">{selectedLocation.name}</h3>
              <button
                onClick={() => setSelectedLocation(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img
                  src={selectedLocation.image_url}
                  alt={selectedLocation.name}
                  className="w-full h-48 object-cover rounded-xl mb-4"
                />
                <div className="space-y-3">
                  <div className="flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span>{selectedLocation.address}, {selectedLocation.city}</span>
                  </div>
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <span>{selectedLocation.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <StarIconSolid className="h-5 w-5 text-yellow-400 mr-3" />
                    <span>{selectedLocation.rating} ({selectedLocation.reviews} reviews)</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-3">Business Hours</h4>
                <div className="space-y-1 text-sm mb-6">
                  {Object.entries(selectedLocation.business_hours).map(([day, hours]) => (
                    <div key={day} className="flex justify-between">
                      <span className="capitalize">{day}:</span>
                      <span>{hours}</span>
                    </div>
                  ))}
                </div>
                
                <h4 className="font-semibold mb-3">Specialties</h4>
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedLocation.specialties.map((specialty) => (
                    <span 
                      key={specialty}
                      className="px-3 py-1 bg-indigo-100 text-olive-700 rounded-full text-sm"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  <Link
                    href={`/shop/${selectedLocation.slug}`}
                    className="w-full py-3 bg-olive-600 hover:bg-olive-700 text-white text-center rounded-lg transition-colors font-medium block"
                  >
                    Visit Shop Page
                  </Link>
                  <button className="w-full py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium">
                    Book Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}