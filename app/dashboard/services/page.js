'use client'

import { 
  ScissorsIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  PencilSquareIcon,
  TrashIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

import ProtectedRoute from '../../../components/ProtectedRoute'
import GlobalNavigation from '../../../components/GlobalNavigation'
import { useAuth } from '../../../components/SupabaseAuthProvider'

// Service categories
const SERVICE_CATEGORIES = [
  { id: 'haircuts', name: 'Haircuts', icon: ScissorsIcon, color: 'blue' },
  { id: 'beard', name: 'Beard & Shave', icon: ScissorsIcon, color: 'green' },
  { id: 'treatments', name: 'Hair Treatments', icon: SparklesIcon, color: 'purple' },
  { id: 'styling', name: 'Styling', icon: ScissorsIcon, color: 'amber' },
  { id: 'color', name: 'Color Services', icon: SparklesIcon, color: 'pink' },
  { id: 'special', name: 'Special Services', icon: SparklesIcon, color: 'indigo' }
]

// Mock services data
const Services = [
  {
    id: 'classic-cut',
    name: 'Classic Haircut',
    category: 'haircuts',
    description: 'Traditional haircut with precision cutting and styling',
    duration: 30,
    price: 35.00,
    popular: true,
    active: true,
    bookings_this_month: 142,
    revenue_this_month: 4970.00,
    average_rating: 4.8,
    includes: ['Consultation', 'Shampoo', 'Cut', 'Style', 'Product finish']
  },
  {
    id: 'premium-cut',
    name: 'Premium Haircut',
    category: 'haircuts',
    description: 'Executive haircut with hot towel service and premium styling',
    duration: 45,
    price: 55.00,
    popular: true,
    active: true,
    bookings_this_month: 87,
    revenue_this_month: 4785.00,
    average_rating: 4.9,
    includes: ['Consultation', 'Shampoo', 'Cut', 'Style', 'Hot towel', 'Scalp massage', 'Premium products']
  },
  {
    id: 'beard-trim',
    name: 'Beard Trim & Shape',
    category: 'beard',
    description: 'Professional beard trimming and shaping',
    duration: 20,
    price: 25.00,
    popular: true,
    active: true,
    bookings_this_month: 98,
    revenue_this_month: 2450.00,
    average_rating: 4.7,
    includes: ['Beard consultation', 'Trim', 'Shape', 'Beard oil treatment']
  },
  {
    id: 'hot-shave',
    name: 'Traditional Hot Shave',
    category: 'beard',
    description: 'Classic hot towel shave with straight razor',
    duration: 40,
    price: 45.00,
    popular: false,
    active: true,
    bookings_this_month: 34,
    revenue_this_month: 1530.00,
    average_rating: 4.95,
    includes: ['Pre-shave oil', 'Hot towel', 'Straight razor shave', 'Aftershave treatment', 'Face moisturizer']
  },
  {
    id: 'kids-cut',
    name: 'Kids Haircut (Under 12)',
    category: 'haircuts',
    description: 'Gentle haircut service for children',
    duration: 25,
    price: 20.00,
    popular: false,
    active: true,
    bookings_this_month: 56,
    revenue_this_month: 1120.00,
    average_rating: 4.6,
    includes: ['Fun consultation', 'Cut', 'Style', 'Lollipop']
  },
  {
    id: 'hair-color',
    name: 'Hair Color Service',
    category: 'color',
    description: 'Professional hair coloring and highlights',
    duration: 90,
    price: 85.00,
    popular: false,
    active: true,
    bookings_this_month: 12,
    revenue_this_month: 1020.00,
    average_rating: 4.8,
    includes: ['Color consultation', 'Application', 'Processing', 'Wash', 'Style']
  },
  {
    id: 'scalp-treatment',
    name: 'Scalp Treatment',
    category: 'treatments',
    description: 'Rejuvenating scalp treatment for healthy hair',
    duration: 30,
    price: 40.00,
    popular: false,
    active: true,
    bookings_this_month: 23,
    revenue_this_month: 920.00,
    average_rating: 4.85,
    includes: ['Scalp analysis', 'Deep cleansing', 'Treatment application', 'Massage', 'Conditioning']
  },
  {
    id: 'hair-design',
    name: 'Creative Hair Design',
    category: 'styling',
    description: 'Custom hair designs and patterns',
    duration: 60,
    price: 75.00,
    popular: false,
    active: true,
    bookings_this_month: 8,
    revenue_this_month: 600.00,
    average_rating: 5.0,
    includes: ['Design consultation', 'Custom pattern', 'Precision cutting', 'Detailing', 'Photo finish']
  }
]

export default function ServicesPage() {
  const { user, profile } = useAuth()
  const [services, setServices] = useState(Services)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingService, setEditingService] = useState(null)

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const getCategoryDetails = (categoryId) => {
    return SERVICE_CATEGORIES.find(cat => cat.id === categoryId) || SERVICE_CATEGORIES[0]
  }

  const getCategoryColor = (categoryId) => {
    const category = getCategoryDetails(categoryId)
    const colors = {
      blue: 'bg-olive-100 text-olive-800 border-olive-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-gold-100 text-gold-800 border-gold-200',
      amber: 'bg-amber-100 text-amber-800 border-amber-200',
      pink: 'bg-pink-100 text-pink-800 border-pink-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    }
    return colors[category.color] || colors.blue
  }

  // Calculate totals
  const totalServices = services.length
  const activeServices = services.filter(s => s.active).length
  const totalMonthlyBookings = services.reduce((sum, s) => sum + s.bookings_this_month, 0)
  const totalMonthlyRevenue = services.reduce((sum, s) => sum + s.revenue_this_month, 0)

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content - adjusting for sidebar */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="mb-8">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      Service Catalog
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Manage your barbershop services, pricing, and availability
                    </p>
                  </div>
                  <div className="mt-4 flex md:mt-0 md:ml-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500 transition-colors"
                    >
                      <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                      Add Service
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ScissorsIcon className="h-6 w-6 text-olive-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Services</p>
                      <p className="text-2xl font-semibold text-gray-900">{totalServices}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Active Services</p>
                      <p className="text-2xl font-semibold text-gray-900">{activeServices}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TagIcon className="h-6 w-6 text-gold-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Monthly Bookings</p>
                      <p className="text-2xl font-semibold text-gray-900">{totalMonthlyBookings}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Monthly Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {formatCurrency(totalMonthlyRevenue)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === 'all'
                        ? 'bg-olive-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    All Services
                  </button>
                  {SERVICE_CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ${
                        selectedCategory === category.id
                          ? 'bg-olive-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <category.icon className="h-4 w-4" />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {/* Search */}
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                    />
                  </div>
                </div>

                {/* Services Grid */}
                {filteredServices.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <ScissorsIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first service.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                    {filteredServices.map((service) => {
                      const category = getCategoryDetails(service.category)
                      const CategoryIcon = category.icon
                      
                      return (
                        <div key={service.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-lg ${getCategoryColor(service.category).split(' ')[0]}`}>
                                  <CategoryIcon className="h-6 w-6 text-current" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {service.name}
                                  </h3>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(service.category)}`}>
                                    {category.name}
                                  </span>
                                </div>
                              </div>
                              {service.popular && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Popular
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-4">
                              {service.description}
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="flex items-center text-sm text-gray-500">
                                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                <span className="font-semibold text-gray-900">{formatCurrency(service.price)}</span>
                              </div>
                              <div className="flex items-center text-sm text-gray-500">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                <span>{formatDuration(service.duration)}</span>
                              </div>
                            </div>
                            
                            {service.includes && (
                              <div className="mb-4">
                                <p className="text-xs font-medium text-gray-500 mb-2">Includes:</p>
                                <div className="flex flex-wrap gap-1">
                                  {service.includes.slice(0, 3).map((item, index) => (
                                    <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                      {item}
                                    </span>
                                  ))}
                                  {service.includes.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                      +{service.includes.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <div className="pt-4 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{service.bookings_this_month} bookings this month</span>
                                <span>⭐ {service.average_rating}</span>
                              </div>
                              <div className="mt-3 flex space-x-2">
                                <button
                                  onClick={() => setEditingService(service)}
                                  className="flex-1 inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                                >
                                  <PencilSquareIcon className="h-4 w-4 mr-1" />
                                  Edit
                                </button>
                                <button
                                  className="inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-400 bg-white hover:text-red-600 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Integration Notice */}
              <div className="mt-8 bg-olive-50 border border-olive-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <ScissorsIcon className="h-6 w-6 text-olive-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-olive-800">
                      Advanced Service Management Features
                    </h3>
                    <div className="mt-2 text-sm text-olive-700">
                      <p>Complete service management system includes:</p>
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        <li>Dynamic pricing based on time and demand</li>
                        <li>Service packages and bundles</li>
                        <li>Staff-specific service assignments</li>
                        <li>Online booking integration</li>
                        <li>Service add-ons and upgrades</li>
                        <li>Seasonal service promotions</li>
                        <li>Customer service preferences tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}