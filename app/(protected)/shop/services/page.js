'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { 
  ScissorsIcon,
  CurrencyDollarIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TagIcon,
  StarIcon,
  ChartBarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  Cog6ToothIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function ShopServicesAndPricing() {
  const { user, profile } = useAuth()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)

  useEffect(() => {
    loadServicesData()
  }, [])

  const getUserBarbershop = async () => {
    // This should be properly implemented based on your auth system
    // For now, return a placeholder or get from user profile
    if (profile?.barbershop_id) {
      return profile.barbershop_id
    }
    
    // Fallback for demo - in real app this would be properly resolved
    return 'demo-barbershop-id'
  }

  const categoryNames = {
    haircut: 'Haircuts',
    beard: 'Beard Care',
    shave: 'Shaves', 
    styling: 'Styling',
    combo: 'Packages',
    treatment: 'Treatments'
  }

  const categoryColors = {
    haircut: 'blue',
    beard: 'green',
    shave: 'red',
    styling: 'purple',
    combo: 'indigo',
    treatment: 'pink'
  }

  const loadServicesData = async () => {
    try {
      const supabase = createClient()
      
      // Get user's barbershop ID (this should be properly implemented based on your auth system)
      const barbershopId = await getUserBarbershop()
      
      if (!barbershopId) {
        console.error('No barbershop ID found')
        setLoading(false)
        return
      }

      // Load shop services with barber customizations
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          barber_customizations:barber_services(
            id,
            barber_id,
            name,
            price,
            duration_minutes,
            description,
            is_active,
            barber:users(name, email)
          )
        `)
        .eq('barbershop_id', barbershopId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (servicesError) {
        console.error('Error loading services:', servicesError)
        // Fallback to mock data for demo
        const mockServices = [
        {
          id: 'service-1',
          name: 'Classic Haircut',
          description: 'Traditional scissor cut with styling',
          category: 'haircut',
          price: 35.00,
          duration_minutes: 45,
          is_featured: true,
          is_active: true,
          online_booking_enabled: true,
          requires_consultation: false,
          monthly_bookings: 89,
          monthly_revenue: 3115.00,
          average_rating: 4.8,
          image_url: 'https://images.unsplash.com/photo-1622286346003-c8b156c91d3b?w=300',
          barbers_offering: ['Alex Rodriguez', 'Jamie Chen', 'Mike Thompson']
        },
        {
          id: 'service-2',
          name: 'Fade Cut',
          description: 'Modern fade with precise blending',
          category: 'haircut',
          price: 40.00,
          duration_minutes: 50,
          is_featured: true,
          is_active: true,
          online_booking_enabled: true,
          requires_consultation: false,
          monthly_bookings: 67,
          monthly_revenue: 2680.00,
          average_rating: 4.9,
          image_url: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=300',
          barbers_offering: ['Jamie Chen', 'Mike Thompson']
        },
        {
          id: 'service-3',
          name: 'Beard Trim & Shape',
          description: 'Professional beard trimming and shaping',
          category: 'beard',
          price: 25.00,
          duration_minutes: 30,
          is_featured: false,
          is_active: true,
          online_booking_enabled: true,
          requires_consultation: false,
          monthly_bookings: 45,
          monthly_revenue: 1125.00,
          average_rating: 4.7,
          image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300',
          barbers_offering: ['Alex Rodriguez', 'Mike Thompson']
        },
        {
          id: 'service-4',
          name: 'Hot Towel Shave',
          description: 'Traditional straight razor shave with hot towel',
          category: 'shave',
          price: 45.00,
          duration_minutes: 60,
          is_featured: false,
          is_active: true,
          online_booking_enabled: false,
          requires_consultation: true,
          monthly_bookings: 5,
          monthly_revenue: 225.00,
          average_rating: 5.0,
          image_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=300',
          barbers_offering: ['Alex Rodriguez']
        },
        {
          id: 'service-5',
          name: 'Hair Wash & Style',
          description: 'Shampoo, conditioning, and professional styling',
          category: 'styling',
          price: 20.00,
          duration_minutes: 25,
          is_featured: false,
          is_active: true,
          online_booking_enabled: true,
          requires_consultation: false,
          monthly_bookings: 32,
          monthly_revenue: 640.00,
          average_rating: 4.6,
          image_url: 'https://images.unsplash.com/photo-1562004760-aceed7bb0fe3?w=300',
          barbers_offering: ['Jamie Chen']
        },
        {
          id: 'service-6',
          name: 'Full Service Package',
          description: 'Haircut, beard trim, shampoo, and styling',
          category: 'combo',
          price: 75.00,
          duration_minutes: 90,
          is_featured: true,
          is_active: true,
          online_booking_enabled: true,
          requires_consultation: false,
          monthly_bookings: 23,
          monthly_revenue: 1725.00,
          average_rating: 4.9,
          image_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=300',
          barbers_offering: ['Mike Thompson']
        }
      ]

      const mockCategories = [
        { id: 'haircut', name: 'Haircuts', count: 2, color: 'blue' },
        { id: 'beard', name: 'Beard Care', count: 1, color: 'green' },
        { id: 'shave', name: 'Shaves', count: 1, color: 'red' },
        { id: 'styling', name: 'Styling', count: 1, color: 'purple' },
        { id: 'combo', name: 'Packages', count: 1, color: 'indigo' }
      ]

      setServices(mockServices)
      setCategories(mockCategories)
      } else {
        // Process real Supabase data
        const enhancedServices = servicesData.map(service => ({
          ...service,
          hasCustomizations: service.barber_customizations?.length > 0,
          customizationCount: service.barber_customizations?.length || 0,
          barbers_offering: service.barber_customizations?.map(bc => bc.barber?.name).filter(Boolean) || []
        }))

        setServices(enhancedServices)

        // Generate categories from actual data
        const uniqueCategories = [...new Set(enhancedServices.map(s => s.category).filter(Boolean))]
        const categoryData = uniqueCategories.map(cat => ({
          id: cat,
          name: categoryNames[cat] || cat,
          count: enhancedServices.filter(s => s.category === cat).length,
          color: categoryColors[cat] || 'gray'
        }))
        
        setCategories(categoryData)
      }
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      haircut: 'bg-olive-100 text-olive-800',
      beard: 'bg-green-100 text-green-800',
      shave: 'bg-red-100 text-red-800',
      styling: 'bg-gold-100 text-gold-800',
      combo: 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const filteredServices = services.filter(service => {
    if (selectedCategory !== 'all' && service.category !== selectedCategory) return false
    if (searchTerm && !service.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalRevenue = services.reduce((sum, service) => sum + service.monthly_revenue, 0)
  const totalBookings = services.reduce((sum, service) => sum + service.monthly_bookings, 0)
  const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-gold-100 flex items-center justify-center">
              <ScissorsIcon className="h-8 w-8 text-gold-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Services & Pricing</h1>
              <p className="text-gray-600">Manage your service catalog and pricing</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Import Services
            </button>
            <button 
              onClick={() => setShowServiceModal(true)}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Service
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-olive-100 rounded-lg">
              <ScissorsIcon className="h-6 w-6 text-olive-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{services.length}</p>
          <p className="text-sm text-gray-600 mt-1">Total Services</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">Monthly Revenue</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
          <p className="text-sm text-gray-600 mt-1">Monthly Bookings</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gold-100 rounded-lg">
              <TagIcon className="h-6 w-6 text-gold-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">${averagePrice.toFixed(0)}</p>
          <p className="text-sm text-gray-600 mt-1">Avg Service Price</p>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Service Categories</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                selectedCategory === 'all' 
                  ? 'bg-indigo-100 text-indigo-800' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Services ({services.length})
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  selectedCategory === category.id
                    ? getCategoryColor(category.id)
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.name} ({category.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>Sort by:</span>
              <select className="border border-gray-300 rounded-lg px-3 py-2">
                <option>Most Popular</option>
                <option>Highest Revenue</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Duration</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <div key={service.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Service Image */}
            <div className="h-48 bg-gray-200 relative">
              {service.image_url ? (
                <img 
                  src={service.image_url} 
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <PhotoIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
              
              {service.is_featured && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <StarIcon className="h-3 w-3 mr-1" />
                    Featured
                  </span>
                </div>
              )}
              
              <div className="absolute top-3 right-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {service.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Service Details */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                    {service.category}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button className="p-1 text-gray-400 hover:text-red-600">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4">{service.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    Price
                  </span>
                  <span className="text-lg font-semibold text-gray-900">${service.price}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Duration
                  </span>
                  <span className="text-sm text-gray-600">{service.duration_minutes} min</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <StarIcon className="h-4 w-4 mr-1" />
                    Rating
                  </span>
                  <span className="text-sm text-gray-600">{service.average_rating}/5</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <ChartBarIcon className="h-4 w-4 mr-1" />
                    Monthly
                  </span>
                  <span className="text-sm text-gray-600">{service.monthly_bookings} bookings</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Monthly Revenue</span>
                  <span className="font-semibold text-green-600">${service.monthly_revenue.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center space-x-4 text-xs text-gray-500">
                {service.online_booking_enabled && (
                  <span className="flex items-center">
                    <GlobeAltIcon className="h-3 w-3 mr-1" />
                    Online booking
                  </span>
                )}
                {service.requires_consultation && (
                  <span className="flex items-center">
                    <Cog6ToothIcon className="h-3 w-3 mr-1" />
                    Consultation required
                  </span>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs text-gray-500">
                  Offered by: {service.barbers_offering.join(', ')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <ScissorsIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No services found matching your criteria</p>
          <button 
            onClick={() => setShowServiceModal(true)}
            className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Your First Service
          </button>
        </div>
      )}
    </div>
  )
}