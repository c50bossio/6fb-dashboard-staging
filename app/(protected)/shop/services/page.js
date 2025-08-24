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
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import ServiceTemplateSelector from '@/components/shop/ServiceTemplateSelector'
import ServiceImageUpload from '@/components/ui/ServiceImageUpload'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'

export default function ShopServicesAndPricing() {
  const { user, profile } = useAuth()
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingServiceId, setDeletingServiceId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'haircut',
    price: '',
    duration_minutes: '30',
    is_active: true,
    is_featured: false,
    online_booking_enabled: true,
    requires_consultation: false,
    image_url: ''
  })
  const [saving, setSaving] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    loadServicesData()
  }, [])

  const getUserBarbershop = async () => {
    if (profile?.barbershop_id) {
      return profile.barbershop_id
    }
    if (profile?.shop_id) {
      return profile.shop_id
    }
    
    // Try to get from barbershop_staff table
    if (profile?.id) {
      const supabase = createClient()
      const { data: staffData } = await supabase
        .from('barbershop_staff')
        .select('barbershop_id')
        .eq('user_id', profile.id)
        .eq('is_active', true)
        .single()
      
      if (staffData?.barbershop_id) {
        return staffData.barbershop_id
      }
    }
    
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
      
      const barbershopId = await getUserBarbershop()
      
      if (!barbershopId || barbershopId === 'demo-barbershop-id') {
        console.log('No barbershop ID found')
        setServices([])
        setCategories([])
        setLoading(false)
        return
      }

      // First, get the main services for the barbershop
      // Note: actual production database uses 'shop_id'
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', barbershopId)
        .order('created_at', { ascending: true })

      if (servicesError) {
        console.error('Error loading services:', servicesError)
        setServices([])
        setCategories([])
        setLoading(false)
        return
      }

      // Get barber customizations separately if services exist
      let barberCustomizations = []
      if (servicesData && servicesData.length > 0) {
        const serviceIds = servicesData.map(s => s.id)
        const { data: customData } = await supabase
          .from('barber_services')
          .select('*')
          .in('service_id', serviceIds)
          .eq('is_active', true)
        
        if (customData) {
          barberCustomizations = customData
        }
      }

      // Get barber profiles for customizations
      const barberIds = [...new Set(barberCustomizations.map(bc => bc.user_id).filter(Boolean))]
      let barberProfiles = []
      if (barberIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', barberIds)
        
        if (profiles) {
          barberProfiles = profiles
        }
      }

      // Merge the data
      const enhancedServices = servicesData.map(service => {
        const serviceCustomizations = barberCustomizations.filter(bc => bc.service_id === service.id)
        const barbersOffering = serviceCustomizations.map(bc => {
          const barber = barberProfiles.find(p => p.id === bc.user_id)
          return barber?.full_name || barber?.email || 'Unknown Barber'
        })

        return {
          ...service,
          hasCustomizations: serviceCustomizations.length > 0,
          customizationCount: serviceCustomizations.length,
          barbers_offering: barbersOffering,
          // Real stats would come from bookings/analytics tables
          monthly_bookings: 0,
          monthly_revenue: 0,
          average_rating: 0
        }
      })

      setServices(enhancedServices)

      // Calculate categories
      const uniqueCategories = [...new Set(enhancedServices.map(s => s.category).filter(Boolean))]
      const categoryData = uniqueCategories.map(cat => ({
        id: cat,
        name: categoryNames[cat] || cat,
        count: enhancedServices.filter(s => s.category === cat).length,
        color: categoryColors[cat] || 'gray'
      }))
      
      setCategories(categoryData)
    } catch (error) {
      console.error('Error loading services:', error)
      setServices([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const getCategoryColor = (category) => {
    const colors = {
      haircut: 'bg-olive-100 text-olive-800',
      beard: 'bg-moss-100 text-moss-900',
      shave: 'bg-softred-100 text-softred-900',
      styling: 'bg-gold-100 text-gold-800',
      combo: 'bg-indigo-100 text-indigo-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const handleAddService = async () => {
    if (!formData.name || !formData.price || !formData.duration_minutes) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const barbershopId = await getUserBarbershop()
      
      if (!barbershopId || barbershopId === 'demo-barbershop-id') {
        toast.error('No barbershop found. Please complete your setup first.')
        setSaving(false)
        return
      }

      const serviceData = {
        shop_id: barbershopId,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        is_active: formData.is_active,
        is_featured: formData.is_featured,
        online_booking_enabled: formData.online_booking_enabled,
        requires_consultation: formData.requires_consultation,
        image_url: formData.image_url || null
      }

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', editingService.id)

        if (error) throw error
        toast.success('Service updated successfully!')
      } else {
        // Add new service
        const { error } = await supabase
          .from('services')
          .insert([serviceData])

        if (error) throw error
        toast.success('Service added successfully!')
      }

      // Reload services
      await loadServicesData()
      
      // Reset form
      setShowServiceModal(false)
      setEditingService(null)
      setFormData({
        name: '',
        description: '',
        category: 'haircut',
        price: '',
        duration_minutes: '30',
        is_active: true,
        is_featured: false,
        online_booking_enabled: true,
        requires_consultation: false,
        image_url: ''
      })
    } catch (error) {
      console.error('Error saving service:', error)
      toast.error(error.message || 'Failed to save service')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickAddTemplate = async (templateData) => {
    setSaving(true)
    try {
      const supabase = createClient()
      const barbershopId = await getUserBarbershop()
      
      if (!barbershopId || barbershopId === 'demo-barbershop-id') {
        toast.error('No barbershop found. Please complete your setup first.')
        setSaving(false)
        return Promise.reject(new Error('No barbershop found'))
      }

      // Check if service with same name already exists
      const { data: existingService } = await supabase
        .from('services')
        .select('id')
        .eq('shop_id', barbershopId)  // Correct: actual database uses shop_id
        .ilike('name', templateData.name)
        .single()

      if (existingService) {
        toast.error(`"${templateData.name}" already exists`)
        setSaving(false)
        return Promise.reject(new Error('Service already exists'))
      }

      // Only include fields that exist in the actual database schema
      const serviceData = {
        shop_id: barbershopId,
        name: templateData.name,
        description: templateData.description || '',
        category: templateData.category || 'general',
        price: parseFloat(templateData.price),
        duration_minutes: parseInt(templateData.duration_minutes),
        is_active: templateData.is_active !== false,
        is_featured: templateData.is_featured || false,
        online_booking_enabled: templateData.online_booking_enabled !== false,
        requires_consultation: templateData.requires_consultation || false,
        image_url: templateData.image_url || null
      }

      const { error } = await supabase
        .from('services')
        .insert([serviceData])

      if (error) throw error
      
      toast.success(`Added "${templateData.name}" to your services!`)
      
      // Reload services to show the new addition
      await loadServicesData()
      
      return Promise.resolve(true)
      
    } catch (error) {
      console.error('Error adding template service:', error)
      toast.error(error.message || 'Failed to add service template')
      setSaving(false)
      return Promise.reject(error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditService = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name || '',
      description: service.description || '',
      category: service.category || 'haircut',
      price: service.price?.toString() || '',
      duration_minutes: service.duration_minutes?.toString() || '30',
      is_active: service.is_active ?? true,
      is_featured: service.is_featured ?? false,
      online_booking_enabled: service.online_booking_enabled ?? true,
      requires_consultation: service.requires_consultation ?? false,
      image_url: service.image_url || ''
    })
    setShowServiceModal(true)
  }

  const handleDeleteService = async () => {
    if (!deletingServiceId) return

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', deletingServiceId)

      if (error) throw error

      toast.success('Service deleted successfully!')
      await loadServicesData()
      
      setShowDeleteConfirm(false)
      setDeletingServiceId(null)
    } catch (error) {
      console.error('Error deleting service:', error)
      toast.error(error.message || 'Failed to delete service')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (service) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id)

      if (error) throw error

      toast.success(`Service ${!service.is_active ? 'activated' : 'deactivated'} successfully!`)
      await loadServicesData()
    } catch (error) {
      console.error('Error toggling service status:', error)
      toast.error('Failed to update service status')
    }
  }

  const handleImportServices = async () => {
    if (!importFile) {
      toast.error('Please select a file to import')
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const response = await fetch('/api/shop/services/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Import failed')
      }

      const result = await response.json()
      toast.success(`Successfully imported ${result.count} services!`)
      
      setShowImportModal(false)
      setImportFile(null)
      await loadServicesData()
    } catch (error) {
      console.error('Error importing services:', error)
      toast.error(error.message || 'Failed to import services')
    } finally {
      setImporting(false)
    }
  }

  const handleExportServices = async () => {
    try {
      const response = await fetch('/api/shop/services/export')
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `services-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      
      toast.success('Services exported successfully!')
    } catch (error) {
      console.error('Error exporting services:', error)
      toast.error('Failed to export services')
    }
  }

  const filteredServices = services.filter(service => {
    if (selectedCategory !== 'all' && service.category !== selectedCategory) return false
    if (searchTerm && !service.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const totalRevenue = services.reduce((sum, service) => sum + service.monthly_revenue, 0)
  const totalBookings = services.reduce((sum, service) => sum + service.monthly_bookings, 0)
  const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : 0

  // Validation function for onboarding completion
  const validateServicesCompletion = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const servicesComplete = data.steps?.services?.complete || false
        const serviceCount = data.steps?.services?.count || 0
        return {
          valid: servicesComplete,
          message: servicesComplete 
            ? `Services configured successfully! You have ${serviceCount} ${serviceCount === 1 ? 'service' : 'services'} active.`
            : 'Please add at least one service with pricing and duration'
        }
      }
    } catch (error) {
      console.error('Error validating services completion:', error)
    }
    
    return {
      valid: false,
      message: 'Unable to validate services. Please ensure you have added at least one service with pricing.'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Onboarding Step Banner */}
      <OnboardingStepBanner 
        stepId="services"
        validateCompletion={validateServicesCompletion}
        completionMessage="Services and pricing configured successfully!"
      />

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
            <button 
              onClick={handleExportServices}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Export CSV
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
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
              <ChartBarIcon className="h-6 w-6 text-amber-800" />
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

      {/* Service Templates - New Compact UI */}
      <ServiceTemplateSelector 
        onAddTemplate={handleQuickAddTemplate}
        existingServices={services}
      />

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
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900">
                    <StarIcon className="h-3 w-3 mr-1" />
                    Featured
                  </span>
                </div>
              )}
              
              <div className="absolute top-3 right-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  service.is_active ? 'bg-moss-100 text-moss-900' : 'bg-softred-100 text-softred-900'
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
                  <button 
                    onClick={() => handleToggleActive(service)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title={service.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {service.is_active ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                  </button>
                  <button 
                    onClick={() => handleEditService(service)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit service"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => {
                      setDeletingServiceId(service.id)
                      setShowDeleteConfirm(true)
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete service"
                  >
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

      {/* Service Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h2>
                <button
                  onClick={() => {
                    setShowServiceModal(false)
                    setEditingService(null)
                    setFormData({
                      name: '',
                      description: '',
                      category: 'haircut',
                      price: '',
                      duration_minutes: '30',
                      is_active: true,
                      is_featured: false,
                      online_booking_enabled: true,
                      requires_consultation: false,
                      image_url: ''
                    })
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                      placeholder="e.g., Classic Haircut"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    >
                      <option value="haircut">Haircuts</option>
                      <option value="beard">Beard Care</option>
                      <option value="shave">Shaves</option>
                      <option value="styling">Styling</option>
                      <option value="combo">Packages</option>
                      <option value="treatment">Treatments</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                      placeholder="Describe the service..."
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Duration */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Pricing & Duration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                      placeholder="35.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                      min="5"
                      step="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                      placeholder="30"
                    />
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Service is active</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Featured service</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.online_booking_enabled}
                      onChange={(e) => setFormData({...formData, online_booking_enabled: e.target.checked})}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Allow online booking</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.requires_consultation}
                      onChange={(e) => setFormData({...formData, requires_consultation: e.target.checked})}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">Requires consultation</span>
                  </label>
                </div>
              </div>

              {/* Service Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Service Image (optional)
                </label>
                <ServiceImageUpload
                  currentImageUrl={formData.image_url}
                  onImageChange={(url) => setFormData({...formData, image_url: url})}
                  serviceId={editingService?.id}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowServiceModal(false)
                  setEditingService(null)
                  setFormData({
                    name: '',
                    description: '',
                    category: 'haircut',
                    price: '',
                    duration_minutes: '30',
                    is_active: true,
                    is_featured: false,
                    online_booking_enabled: true,
                    requires_consultation: false,
                    image_url: ''
                  })
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                disabled={saving || !formData.name || !formData.price || !formData.duration_minutes}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : editingService ? 'Update Service' : 'Add Service'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
                <TrashIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-2">
                Delete Service
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete this service? This action cannot be undone.
              </p>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeletingServiceId(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteService}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Import Services</h2>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setImportFile(null)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Upload a CSV file with your services. The file should include columns for:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>name (required)</li>
                  <li>description</li>
                  <li>category (haircut, beard, shave, styling, combo, treatment)</li>
                  <li>price (required)</li>
                  <li>duration_minutes (required)</li>
                  <li>is_active (true/false)</li>
                  <li>is_featured (true/false)</li>
                  <li>online_booking_enabled (true/false)</li>
                </ul>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        {importFile ? importFile.name : 'Click to upload or drag and drop'}
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".csv"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">CSV files only</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <a
                  href="/templates/services-template.csv"
                  download
                  className="text-sm text-olive-600 hover:text-olive-700"
                >
                  Download template CSV
                </a>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowImportModal(false)
                  setImportFile(null)
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={importing}
              >
                Cancel
              </button>
              <button
                onClick={handleImportServices}
                disabled={importing || !importFile}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Services'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}