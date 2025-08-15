'use client'

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
  XCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { hasPermission, validateServicePricing, validateServiceDuration, getPermissionLevel } from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

export default function ServiceManager({ 
  userRole, 
  userId, 
  barbershopId, 
  permissions = null,
  onServiceUpdate = null 
}) {
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [userPermissions, setUserPermissions] = useState(permissions)

  const isBarber = userRole === 'BARBER'
  const isShopOwner = ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)

  useEffect(() => {
    loadServicesData()
    if (isBarber && !permissions) {
      loadBarberPermissions()
    }
  }, [userId, barbershopId])

  const loadBarberPermissions = async () => {
    if (!isBarber || !userId || !barbershopId) return
    
    try {
      const { getBarberPermissions } = await import('@/lib/permissions')
      const perms = await getBarberPermissions(userId, barbershopId)
      setUserPermissions(perms)
    } catch (error) {
      console.error('Error loading barber permissions:', error)
    }
  }

  const loadServicesData = async () => {
    const supabase = createClient()
    
    try {
      let servicesQuery
      
      if (isBarber) {
        const { data: barberServices } = await supabase
          .from('barber_services')
          .select('*')
          .eq('barber_id', userId)
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
        
        const { data: shopServices } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
        
        const mergedServices = mergeServices(shopServices || [], barberServices || [])
        setServices(mergedServices)
      } else {
        const { data: shopServices } = await supabase
          .from('services')
          .select('*')
          .eq('barbershop_id', barbershopId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
        
        setServices(shopServices || [])
      }

      const uniqueCategories = [...new Set(services.map(s => s.category).filter(Boolean))]
      const categoryData = uniqueCategories.map(cat => ({
        id: cat,
        name: categoryNames[cat] || cat,
        count: services.filter(s => s.category === cat).length,
        color: categoryColors[cat] || 'gray'
      }))
      
      setCategories(categoryData)
    } catch (error) {
      console.error('Error loading services:', error)
    } finally {
      setLoading(false)
    }
  }

  const mergeServices = (shopServices, barberServices) => {
    const merged = []
    const barberServiceMap = new Map(
      barberServices.map(bs => [bs.base_service_id, bs])
    )
    
    shopServices.forEach(shopService => {
      const barberCustomization = barberServiceMap.get(shopService.id)
      
      if (barberCustomization) {
        merged.push({
          ...shopService,
          ...barberCustomization,
          isCustomized: true,
          basePrice: shopService.price,
          baseDuration: shopService.duration_minutes,
          customPrice: barberCustomization.price,
          customDuration: barberCustomization.duration_minutes
        })
      } else {
        merged.push({
          ...shopService,
          isCustomized: false
        })
      }
    })
    
    barberServices
      .filter(bs => !bs.base_service_id)
      .forEach(barberService => {
        merged.push({
          ...barberService,
          isCustomized: true,
          isBarberOnly: true
        })
      })
    
    return merged
  }

  const canEditService = (service) => {
    if (isShopOwner) return true
    if (!isBarber || !userPermissions) return false
    
    if (!userPermissions.can_modify_services) return false
    
    if (service.isBarberOnly) return true
    
    return true
  }

  const canEditPricing = (service) => {
    if (isShopOwner) return true
    if (!isBarber || !userPermissions) return false
    
    return userPermissions.can_set_pricing
  }

  const canCreateService = () => {
    if (isShopOwner) return true
    if (!isBarber || !userPermissions) return false
    
    return userPermissions.can_create_services
  }

  const getServicePermissionIndicator = (service) => {
    if (isShopOwner) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
          <ShieldCheckIcon className="h-3 w-3 mr-1" />
          Owner
        </span>
      )
    }
    
    if (!service.isCustomized) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <LockClosedIcon className="h-3 w-3 mr-1" />
          Shop Default
        </span>
      )
    }
    
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-moss-100 text-moss-900">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Customized
      </span>
    )
  }

  const getPricingValidation = (service, newPrice) => {
    if (!isBarber || !service.basePrice) return { isValid: true }
    
    const variance = userPermissions?.pricing_variance_percent || 0
    const basePrice = service.basePrice
    const maxPrice = basePrice * (1 + variance / 100)
    const minPrice = basePrice * (1 - variance / 100)
    
    return {
      isValid: newPrice >= minPrice && newPrice <= maxPrice,
      minPrice,
      maxPrice,
      variance
    }
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

  const getCategoryColor = (category) => {
    const colors = {
      haircut: 'bg-olive-100 text-olive-800',
      beard: 'bg-moss-100 text-moss-900',
      shave: 'bg-softred-100 text-softred-900',
      styling: 'bg-gold-100 text-gold-800',
      combo: 'bg-indigo-100 text-indigo-800',
      treatment: 'bg-pink-100 text-pink-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const filteredServices = services.filter(service => {
    if (selectedCategory !== 'all' && service.category !== selectedCategory) return false
    if (searchTerm && !service.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Permission Level Indicator for Barbers */}
      {isBarber && userPermissions && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-olive-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Your Service Permissions</h3>
                <p className="text-sm text-gray-600">
                  Level: {getPermissionLevel(userPermissions).description}
                </p>
              </div>
            </div>
            <div className="text-right">
              {userPermissions.can_set_pricing && (
                <p className="text-sm text-green-600">
                  ✓ Pricing: ±{userPermissions.pricing_variance_percent}%
                </p>
              )}
              {userPermissions.can_modify_services && (
                <p className="text-sm text-green-600">✓ Service Management</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Categories Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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

      {/* Search and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-80"
              />
            </div>

            {canCreateService() && (
              <button 
                onClick={() => setEditingService({})}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {isBarber ? 'Add Personal Service' : 'Add Service'}
              </button>
            )}
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
              
              {/* Permission Indicator */}
              <div className="absolute top-3 left-3">
                {getServicePermissionIndicator(service)}
              </div>
              
              {service.is_featured && (
                <div className="absolute top-3 right-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                    <StarIcon className="h-3 w-3 mr-1" />
                    Featured
                  </span>
                </div>
              )}
            </div>

            {/* Service Details */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                    {categoryNames[service.category] || service.category}
                  </span>
                </div>
                {canEditService(service) && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => setEditingService(service)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-gray-600 text-sm mb-4">{service.description}</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                    Price
                  </span>
                  <div className="text-right">
                    <span className="text-lg font-semibold text-gray-900">
                      ${service.price}
                    </span>
                    {service.isCustomized && service.basePrice !== service.price && (
                      <p className="text-xs text-gray-500">
                        Base: ${service.basePrice}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    Duration
                  </span>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">
                      {service.duration_minutes} min
                    </span>
                    {service.isCustomized && service.baseDuration !== service.duration_minutes && (
                      <p className="text-xs text-gray-500">
                        Base: {service.baseDuration} min
                      </p>
                    )}
                  </div>
                </div>

                {service.monthly_bookings && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      Monthly
                    </span>
                    <span className="text-sm text-gray-600">{service.monthly_bookings} bookings</span>
                  </div>
                )}
              </div>

              {/* Service Features */}
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
            </div>
          </div>
        ))}
      </div>

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <ScissorsIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No services found matching your criteria</p>
          {canCreateService() && (
            <button 
              onClick={() => setEditingService({})}
              className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Service
            </button>
          )}
        </div>
      )}
    </div>
  )
}