'use client'

import { useState } from 'react'
import {
  BuildingOfficeIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  PhoneIcon,
  EnvelopeIcon,
  PlusIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  DocumentDuplicateIcon,
  ArrowRightIcon,
  GlobeAltIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

const locationTemplates = [
  {
    id: 'flagship',
    title: 'Flagship Location',
    description: 'Main location with full services',
    features: ['All services', 'Senior barbers', 'Training center']
  },
  {
    id: 'satellite',
    title: 'Satellite Location',
    description: 'Smaller location with core services',
    features: ['Core services', 'Lower overhead', 'Quick cuts focus']
  },
  {
    id: 'express',
    title: 'Express Location',
    description: 'High-volume, appointment-only',
    features: ['Online booking only', 'Standardized services', 'Fast turnover']
  },
  {
    id: 'premium',
    title: 'Premium Location',
    description: 'High-end services and experience',
    features: ['Premium pricing', 'VIP services', 'Luxury amenities']
  }
]

const defaultHours = {
  monday: { open: '09:00', close: '19:00', closed: false },
  tuesday: { open: '09:00', close: '19:00', closed: false },
  wednesday: { open: '09:00', close: '19:00', closed: false },
  thursday: { open: '09:00', close: '19:00', closed: false },
  friday: { open: '09:00', close: '20:00', closed: false },
  saturday: { open: '09:00', close: '18:00', closed: false },
  sunday: { open: '10:00', close: '17:00', closed: false }
}

export default function LocationManagementSetup({ onComplete, initialData = {} }) {
  const [locations, setLocations] = useState(initialData.locations || [])
  const [currentLocation, setCurrentLocation] = useState({
    name: '',
    type: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    email: '',
    manager: '',
    managerEmail: '',
    managerPhone: '',
    staffCount: 3,
    chairCount: 4,
    hours: { ...defaultHours },
    services: [],
    features: [],
    monthlyRent: '',
    targetRevenue: '',
    openingDate: ''
  })
  const [expandedLocation, setExpandedLocation] = useState(null)
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [useTemplateHours, setUseTemplateHours] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  const commonServices = [
    'Haircut', 'Beard Trim', 'Hot Towel Shave', 'Hair Color', 'Kids Cut',
    'Senior Cut', 'Fade', 'Line Up', 'Hair Design', 'Facial'
  ]

  const locationFeatures = [
    'Walk-ins Welcome', 'Appointment Only', 'Online Booking', 'Mobile Payments',
    'Loyalty Program', 'Gift Cards', 'Product Sales', 'Complimentary Beverages',
    'TV/Entertainment', 'WiFi', 'Parking', 'Wheelchair Accessible'
  ]

  const validateLocation = () => {
    const errors = {}
    if (!currentLocation.name) errors.name = 'Location name is required'
    if (!currentLocation.address) errors.address = 'Address is required'
    if (!currentLocation.city) errors.city = 'City is required'
    if (!currentLocation.state) errors.state = 'State is required'
    if (!currentLocation.zip) errors.zip = 'ZIP code is required'
    if (!currentLocation.phone) errors.phone = 'Phone number is required'
    if (!currentLocation.email) errors.email = 'Email is required'
    if (!currentLocation.manager) errors.manager = 'Manager name is required'
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddLocation = () => {
    if (validateLocation()) {
      const newLocation = {
        ...currentLocation,
        id: Date.now().toString(),
        status: 'pending',
        createdAt: new Date().toISOString()
      }
      setLocations([...locations, newLocation])
      resetLocationForm()
      setShowLocationForm(false)
    }
  }

  const resetLocationForm = () => {
    setCurrentLocation({
      name: '',
      type: '',
      address: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      email: '',
      manager: '',
      managerEmail: '',
      managerPhone: '',
      staffCount: 3,
      chairCount: 4,
      hours: { ...defaultHours },
      services: [],
      features: [],
      monthlyRent: '',
      targetRevenue: '',
      openingDate: ''
    })
    setValidationErrors({})
    setSelectedTemplate(null)
  }

  const handleRemoveLocation = (locationId) => {
    setLocations(locations.filter(loc => loc.id !== locationId))
  }

  const handleDuplicateLocation = (location) => {
    const duplicated = {
      ...location,
      id: Date.now().toString(),
      name: `${location.name} (Copy)`,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    setLocations([...locations, duplicated])
  }

  const handleServiceToggle = (service) => {
    if (currentLocation.services.includes(service)) {
      setCurrentLocation({
        ...currentLocation,
        services: currentLocation.services.filter(s => s !== service)
      })
    } else {
      setCurrentLocation({
        ...currentLocation,
        services: [...currentLocation.services, service]
      })
    }
  }

  const handleFeatureToggle = (feature) => {
    if (currentLocation.features.includes(feature)) {
      setCurrentLocation({
        ...currentLocation,
        features: currentLocation.features.filter(f => f !== feature)
      })
    } else {
      setCurrentLocation({
        ...currentLocation,
        features: [...currentLocation.features, feature]
      })
    }
  }

  const handleHoursChange = (day, field, value) => {
    setCurrentLocation({
      ...currentLocation,
      hours: {
        ...currentLocation.hours,
        [day]: {
          ...currentLocation.hours[day],
          [field]: value
        }
      }
    })
  }

  const applyTemplateHours = () => {
    if (locations.length > 0) {
      setCurrentLocation({
        ...currentLocation,
        hours: { ...locations[0].hours }
      })
    }
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template.id)
    setCurrentLocation({
      ...currentLocation,
      type: template.id,
      features: template.id === 'flagship' 
        ? ['Walk-ins Welcome', 'Online Booking', 'Loyalty Program', 'Product Sales', 'TV/Entertainment', 'WiFi', 'Parking']
        : template.id === 'express'
        ? ['Appointment Only', 'Online Booking', 'Mobile Payments', 'WiFi']
        : template.id === 'premium'
        ? ['Appointment Only', 'Online Booking', 'Mobile Payments', 'Complimentary Beverages', 'WiFi', 'Parking', 'Wheelchair Accessible']
        : ['Walk-ins Welcome', 'Online Booking', 'Mobile Payments', 'WiFi'],
      services: template.id === 'express'
        ? ['Haircut', 'Beard Trim', 'Fade', 'Line Up']
        : template.id === 'premium'
        ? commonServices
        : ['Haircut', 'Beard Trim', 'Hot Towel Shave', 'Fade', 'Kids Cut']
    })
  }

  const calculateTotalMetrics = () => {
    const totalStaff = locations.reduce((sum, loc) => sum + (loc.staffCount || 0), 0)
    const totalChairs = locations.reduce((sum, loc) => sum + (loc.chairCount || 0), 0)
    const totalRent = locations.reduce((sum, loc) => sum + (parseFloat(loc.monthlyRent) || 0), 0)
    const totalRevenue = locations.reduce((sum, loc) => sum + (parseFloat(loc.targetRevenue) || 0), 0)
    
    return { totalStaff, totalChairs, totalRent, totalRevenue }
  }

  const metrics = calculateTotalMetrics()

  const handleComplete = () => {
    onComplete({
      locations,
      totalMetrics: metrics,
      primaryLocation: locations[0] || null
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">
          Manage Your Locations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Add and configure multiple barbershop locations
        </p>
      </div>

      {/* Quick Stats */}
      {locations.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center">
              <BuildingOfficeIcon className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">{locations.length}</div>
                <div className="text-xs text-gray-600">Locations</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center">
              <UsersIcon className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">{metrics.totalStaff}</div>
                <div className="text-xs text-gray-600">Total Staff</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center">
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  ${metrics.totalRent.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Monthly Rent</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center">
              <ChartBarIcon className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <div className="text-2xl font-semibold text-gray-900">
                  ${metrics.totalRevenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">Target Revenue</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Location List */}
      {locations.length > 0 && (
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div key={location.id} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setExpandedLocation(expandedLocation === location.id ? null : location.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 bg-olive-100 text-olive-700 rounded-full font-semibold text-sm mr-3">
                    {index + 1}
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">{location.name}</h4>
                    <p className="text-sm text-gray-600">
                      {location.city}, {location.state} • {location.staffCount} staff • {location.chairCount} chairs
                    </p>
                  </div>
                </div>
                {expandedLocation === location.id ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedLocation === location.id && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Location Details */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Location Details</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <MapPinIcon className="w-4 h-4 text-gray-400 mr-2 mt-0.5" />
                          <div>
                            <div>{location.address}</div>
                            <div>{location.city}, {location.state} {location.zip}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <PhoneIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{location.phone}</span>
                        </div>
                        <div className="flex items-center">
                          <EnvelopeIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span>{location.email}</span>
                        </div>
                        <div className="flex items-center">
                          <UsersIcon className="w-4 h-4 text-gray-400 mr-2" />
                          <span>Manager: {location.manager}</span>
                        </div>
                      </div>
                    </div>

                    {/* Services & Features */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Services & Features</h5>
                      <div className="space-y-2">
                        <div>
                          <span className="text-xs text-gray-600">Services:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {location.services.slice(0, 5).map(service => (
                              <span key={service} className="px-2 py-1 bg-olive-100 text-olive-700 text-xs rounded">
                                {service}
                              </span>
                            ))}
                            {location.services.length > 5 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{location.services.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-600">Features:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {location.features.slice(0, 4).map(feature => (
                              <span key={feature} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                                {feature}
                              </span>
                            ))}
                            {location.features.length > 4 && (
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                +{location.features.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleDuplicateLocation(location)}
                      className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleRemoveLocation(location.id)}
                      className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Location Form */}
      {showLocationForm ? (
        <div className="border-2 border-olive-200 rounded-lg p-4 bg-olive-50">
          <h4 className="font-medium text-gray-900 mb-4">Add New Location</h4>

          {/* Location Templates */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Location Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {locationTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`
                    p-3 rounded-lg border text-left text-sm
                    ${selectedTemplate === template.id
                      ? 'border-olive-500 bg-white'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                  `}
                >
                  <div className="font-medium text-gray-900">{template.title}</div>
                  <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location Name *
              </label>
              <input
                type="text"
                value={currentLocation.name}
                onChange={(e) => setCurrentLocation({...currentLocation, name: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g., Downtown Branch"
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={currentLocation.phone}
                onChange={(e) => setCurrentLocation({...currentLocation, phone: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.phone ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="(555) 123-4567"
              />
              {validationErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={currentLocation.email}
                onChange={(e) => setCurrentLocation({...currentLocation, email: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.email ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="downtown@barbershop.com"
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opening Date
              </label>
              <input
                type="date"
                value={currentLocation.openingDate}
                onChange={(e) => setCurrentLocation({...currentLocation, openingDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                value={currentLocation.address}
                onChange={(e) => setCurrentLocation({...currentLocation, address: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="123 Main Street"
              />
              {validationErrors.address && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={currentLocation.city}
                onChange={(e) => setCurrentLocation({...currentLocation, city: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.city ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="New York"
              />
              {validationErrors.city && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.city}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State *
                </label>
                <input
                  type="text"
                  value={currentLocation.state}
                  onChange={(e) => setCurrentLocation({...currentLocation, state: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md ${validationErrors.state ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="NY"
                  maxLength="2"
                />
                {validationErrors.state && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.state}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP *
                </label>
                <input
                  type="text"
                  value={currentLocation.zip}
                  onChange={(e) => setCurrentLocation({...currentLocation, zip: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md ${validationErrors.zip ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="10001"
                />
                {validationErrors.zip && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.zip}</p>
                )}
              </div>
            </div>
          </div>

          {/* Manager Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Name *
              </label>
              <input
                type="text"
                value={currentLocation.manager}
                onChange={(e) => setCurrentLocation({...currentLocation, manager: e.target.value})}
                className={`w-full px-3 py-2 border rounded-md ${validationErrors.manager ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="John Smith"
              />
              {validationErrors.manager && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.manager}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Email
              </label>
              <input
                type="email"
                value={currentLocation.managerEmail}
                onChange={(e) => setCurrentLocation({...currentLocation, managerEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="john@barbershop.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manager Phone
              </label>
              <input
                type="tel"
                value={currentLocation.managerPhone}
                onChange={(e) => setCurrentLocation({...currentLocation, managerPhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="(555) 234-5678"
              />
            </div>
          </div>

          {/* Capacity & Financials */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Staff Count
              </label>
              <input
                type="number"
                value={currentLocation.staffCount}
                onChange={(e) => setCurrentLocation({...currentLocation, staffCount: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chair Count
              </label>
              <input
                type="number"
                value={currentLocation.chairCount}
                onChange={(e) => setCurrentLocation({...currentLocation, chairCount: parseInt(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Rent
              </label>
              <input
                type="number"
                value={currentLocation.monthlyRent}
                onChange={(e) => setCurrentLocation({...currentLocation, monthlyRent: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="3000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Revenue
              </label>
              <input
                type="number"
                value={currentLocation.targetRevenue}
                onChange={(e) => setCurrentLocation({...currentLocation, targetRevenue: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="15000"
              />
            </div>
          </div>

          {/* Services Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Services Offered
            </label>
            <div className="flex flex-wrap gap-2">
              {commonServices.map(service => (
                <button
                  key={service}
                  onClick={() => handleServiceToggle(service)}
                  className={`
                    px-3 py-1 rounded-full text-sm transition-colors
                    ${currentLocation.services.includes(service)
                      ? 'bg-olive-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>

          {/* Features Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location Features
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {locationFeatures.map(feature => (
                <label key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={currentLocation.features.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                    className="mr-2 rounded text-olive-600 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700">{feature}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Operating Hours */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Operating Hours
              </label>
              {locations.length > 0 && (
                <button
                  onClick={applyTemplateHours}
                  className="text-sm text-olive-600 hover:text-olive-700"
                >
                  Copy from first location
                </button>
              )}
            </div>
            <div className="space-y-2">
              {Object.entries(currentLocation.hours).map(([day, hours]) => (
                <div key={day} className="grid grid-cols-4 gap-2 items-center">
                  <div className="text-sm text-gray-700 capitalize">{day}</div>
                  <input
                    type="time"
                    value={hours.open}
                    onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                    disabled={hours.closed}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="time"
                    value={hours.close}
                    onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                    disabled={hours.closed}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={hours.closed}
                      onChange={(e) => handleHoursChange(day, 'closed', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-600">Closed</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleAddLocation}
              className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700"
            >
              Add Location
            </button>
            <button
              onClick={() => {
                resetLocationForm()
                setShowLocationForm(false)
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowLocationForm(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
        >
          <div className="flex flex-col items-center">
            <PlusIcon className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-700">Add New Location</span>
            <span className="text-xs text-gray-500 mt-1">
              Configure a new barbershop location
            </span>
          </div>
        </button>
      )}

      {/* Complete Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-gray-600">
          {locations.length === 0
            ? 'Add at least one location to continue'
            : `${locations.length} location${locations.length !== 1 ? 's' : ''} configured`
          }
        </div>
        <button
          onClick={handleComplete}
          disabled={locations.length === 0}
          className={`
            px-6 py-2 rounded-md font-medium transition-colors
            ${locations.length > 0
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Complete Location Setup
        </button>
      </div>
    </div>
  )
}