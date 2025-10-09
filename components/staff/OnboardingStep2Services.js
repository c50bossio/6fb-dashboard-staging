'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { createClient } from '@/lib/supabase/client'

/**
 * Step 2: Service Assignment
 * Allows admin to select which services this barber will offer
 */
export default function OnboardingStep2Services({ data, onChange, onNext, onBack }) {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all active services from database
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name, description, duration_minutes, price, category')
        .eq('active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (servicesError) throw servicesError

      setServices(servicesData || [])
    } catch (err) {
      console.error('Error fetching services:', err)
      setError('Failed to load services. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleService = (serviceId) => {
    const selectedServices = data.selectedServices || []
    const isSelected = selectedServices.includes(serviceId)

    const newServices = isSelected
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId]

    onChange({ selectedServices: newServices })
  }

  const isServiceSelected = (serviceId) => {
    return (data.selectedServices || []).includes(serviceId)
  }

  const handleSelectAll = () => {
    const allServiceIds = services.map(s => s.id)
    onChange({ selectedServices: allServiceIds })
  }

  const handleDeselectAll = () => {
    onChange({ selectedServices: [] })
  }

  const handleSubmit = () => {
    if ((data.selectedServices || []).length === 0) {
      setError('Please select at least one service')
      return
    }

    onNext()
  }

  // Group services by category
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Service Assignment</h2>
          <p className="text-gray-600 mt-1">Loading services...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Service Assignment</h2>
        <p className="text-gray-600 mt-1">
          Select the services that <strong>{data.firstName} {data.lastName}</strong> will provide
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Selection Summary & Controls */}
      <div className="flex justify-between items-center p-4 bg-olive-50 border border-olive-200 rounded-lg">
        <div>
          <p className="text-sm font-medium text-olive-900">
            {(data.selectedServices || []).length} of {services.length} services selected
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Select All
          </button>
          <span className="text-gray-400">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Deselect All
          </button>
        </div>
      </div>

      {/* Service List by Category */}
      <div className="space-y-6">
        {Object.keys(groupedServices).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-600 mb-2">No services available</p>
            <p className="text-sm text-gray-500">
              Please add services to your shop first before onboarding staff
            </p>
          </div>
        ) : (
          Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category}>
              {/* Category Header */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{category}</h3>

              {/* Service Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categoryServices.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                      isServiceSelected(service.id)
                        ? 'border-olive-500 bg-olive-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {/* Selected Indicator */}
                    {isServiceSelected(service.id) && (
                      <div className="absolute top-2 right-2">
                        <CheckCircleIcon className="h-6 w-6 text-olive-600" />
                      </div>
                    )}

                    {/* Service Details */}
                    <div className="pr-8">
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">
                          {service.duration_minutes} min
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          ${service.price.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={(data.selectedServices || []).length === 0}
          className="px-6 py-2 text-white bg-olive-600 rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Financial Setup
        </button>
      </div>
    </div>
  )
}
