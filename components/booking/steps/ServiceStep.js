'use client'

import { ClockIcon, CurrencyDollarIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function ServiceStep({ bookingData, onNext, onBack }) {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(bookingData.service)
  const [selectedAddOns, setSelectedAddOns] = useState(bookingData.addOns || [])
  const [loading, setLoading] = useState(true)
  const [showAddOns, setShowAddOns] = useState(false)
  
  useEffect(() => {
    loadServices()
  }, [bookingData.barber])
  
  const loadServices = async () => {
    try {
      const barberServices = bookingData.barberDetails?.services || []
      
      const standardServices = [
        {
          id: 'srv_1',
          name: 'Classic Haircut',
          description: 'Traditional haircut with clean lines and professional finish',
          category: 'Haircuts',
          basePrice: 35,
          baseDuration: 30,
          price: 35,
          duration: 30,
          popular: true,
          image: '/images/service-haircut.jpg'
        },
        {
          id: 'srv_2',
          name: 'Fade & Design',
          description: 'Precision fade with optional hair design or patterns',
          category: 'Haircuts',
          basePrice: 45,
          baseDuration: 45,
          price: 45,
          duration: 45,
          popular: true,
          image: '/images/service-fade.jpg'
        },
        {
          id: 'srv_3',
          name: 'Beard Trim',
          description: 'Professional beard shaping and grooming',
          category: 'Beard Services',
          basePrice: 20,
          baseDuration: 20,
          price: 20,
          duration: 20,
          image: '/images/service-beard.jpg'
        },
        {
          id: 'srv_4',
          name: 'Full Service',
          description: 'Complete grooming package: haircut, beard trim, and hot towel',
          category: 'Packages',
          basePrice: 65,
          baseDuration: 60,
          price: 65,
          duration: 60,
          popular: true,
          premium: true,
          image: '/images/service-full.jpg'
        },
        {
          id: 'srv_5',
          name: 'Color Service',
          description: 'Professional hair coloring and highlights',
          category: 'Special Services',
          basePrice: 85,
          baseDuration: 90,
          price: 85,
          duration: 90,
          image: '/images/service-color.jpg'
        },
        {
          id: 'srv_7',
          name: 'Kids Cut',
          description: 'Gentle haircut service for children under 12',
          category: 'Haircuts',
          basePrice: 20,
          baseDuration: 20,
          price: 20,
          duration: 20,
          image: '/images/service-kids.jpg'
        }
      ]
      
      let finalServices = standardServices
      
      if (barberServices.length > 0 && !bookingData.barberDetails?.isAnyBarber) {
        finalServices = standardServices.map(service => {
          const barberService = barberServices.find(bs => bs.id === service.id)
          if (barberService) {
            return {
              ...service,
              duration: barberService.duration,
              price: barberService.price,
              barberAdjusted: true,
              priceDiff: barberService.price - service.basePrice,
              durationDiff: barberService.duration - service.baseDuration
            }
          }
          return service
        }).filter(service => barberServices.some(bs => bs.id === service.id))
      }
      
      const addOnServices = [
        {
          id: 'addon_1',
          name: 'Hot Towel Treatment',
          description: 'Relaxing hot towel service',
          price: 10,
          duration: 5,
          icon: '♨️'
        },
        {
          id: 'addon_2',
          name: 'Hair Wash',
          description: 'Shampoo and conditioning',
          price: 10,
          duration: 10,
          icon: '🚿'
        },
        {
          id: 'addon_3',
          name: 'Scalp Massage',
          description: '5-minute relaxing scalp massage',
          price: 15,
          duration: 5,
          icon: '💆‍♂️'
        },
        {
          id: 'addon_4',
          name: 'Line Up Touch-up',
          description: 'Perfect edge and line work',
          price: 8,
          duration: 5,
          icon: '✂️'
        },
        {
          id: 'addon_5',
          name: 'Product Styling',
          description: 'Premium product application and styling',
          price: 12,
          duration: 5,
          icon: '💈'
        }
      ]
      
      setServices(finalServices)
      
      window.availableAddOns = addOnServices
      
      setLoading(false)
    } catch (error) {
      console.error('Error loading services:', error)
      setLoading(false)
    }
  }
  
  const handleServiceSelect = (service) => {
    setSelectedService(service.id)
  }
  
  const handleAddOnToggle = (addOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(a => a.id === addOn.id)
      if (exists) {
        return prev.filter(a => a.id !== addOn.id)
      } else {
        return [...prev, addOn]
      }
    })
  }
  
  const calculateTotalDuration = () => {
    const service = services.find(s => s.id === selectedService)
    const baseDuration = service?.duration || 0
    const addOnDuration = selectedAddOns.reduce((sum, addon) => sum + addon.duration, 0)
    return baseDuration + addOnDuration
  }
  
  const calculateTotalPrice = () => {
    const service = services.find(s => s.id === selectedService)
    const basePrice = service?.price || 0
    const addOnPrice = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0)
    return basePrice + addOnPrice
  }
  
  const handleContinue = () => {
    const service = services.find(s => s.id === selectedService)
    if (service) {
      onNext({
        service: service.id,
        serviceDetails: service,
        addOns: selectedAddOns,
        duration: calculateTotalDuration(),
        price: calculateTotalPrice()
      })
    }
  }
  
  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {})
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Service</h2>
        <p className="text-gray-600">
          {bookingData.barberDetails?.isAnyBarber 
            ? 'Select a service (times may vary by barber)'
            : `Services by ${bookingData.barberDetails?.name} with personalized timing`}
        </p>
      </div>
      
      {/* Barber Note */}
      {!bookingData.barberDetails?.isAnyBarber && (
        <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
          <p className="text-sm text-olive-800">
            💡 Service times and prices shown are specific to {bookingData.barberDetails?.name}'s expertise and speed
          </p>
        </div>
      )}
      
      {/* Services by Category */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg h-24"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6 max-h-[400px] overflow-y-auto">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              
              <div className="space-y-3">
                {categoryServices.map(service => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedService === service.id
                        ? 'border-olive-500 bg-olive-50 ring-2 ring-olive-200'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="text-lg font-semibold text-gray-900">{service.name}</h4>
                          {service.popular && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-900 text-xs font-medium rounded-full">
                              Popular
                            </span>
                          )}
                          {service.premium && (
                            <span className="ml-2 px-2 py-0.5 bg-gold-100 text-gold-800 text-xs font-medium rounded-full">
                              <SparklesIcon className="inline h-3 w-3 mr-0.5" />
                              Premium
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                        
                        <div className="flex items-center space-x-4 mt-3">
                          <div className="flex items-center text-sm">
                            <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">{service.duration} min</span>
                            {service.barberAdjusted && service.durationDiff !== 0 && (
                              <span className={`ml-1 text-xs ${
                                service.durationDiff > 0 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                ({service.durationDiff > 0 ? '+' : ''}{service.durationDiff} min)
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center text-sm">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="font-medium">${service.price}</span>
                            {service.barberAdjusted && service.priceDiff !== 0 && (
                              <span className={`ml-1 text-xs ${
                                service.priceDiff > 0 ? 'text-orange-600' : 'text-green-600'
                              }`}>
                                ({service.priceDiff > 0 ? '+' : ''}${service.priceDiff})
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {service.barberAdjusted && (
                          <p className="text-xs text-gray-500 mt-2 italic">
                            * Adjusted for {bookingData.barberDetails?.name}'s technique
                          </p>
                        )}
                      </div>
                      
                      {/* Service Image */}
                      {service.image && (
                        <div className="ml-4 w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0">
                          <img
                            src={service.image}
                            alt={service.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                    
                    {/* Selection Indicator */}
                    {selectedService === service.id && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-olive-600 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add-ons Section */}
      {selectedService && (
        <div className="border-t pt-4">
          <button
            onClick={() => setShowAddOns(!showAddOns)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center">
              <PlusIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className="font-medium text-gray-900">Add Extra Services</span>
              {selectedAddOns.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-olive-100 text-olive-800 text-xs font-medium rounded-full">
                  {selectedAddOns.length} selected
                </span>
              )}
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${showAddOns ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAddOns && window.availableAddOns && (
            <div className="mt-4 space-y-2">
              {window.availableAddOns.map(addOn => (
                <label
                  key={addOn.id}
                  className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedAddOns.some(a => a.id === addOn.id)}
                    onChange={() => handleAddOnToggle(addOn)}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{addOn.icon}</span>
                        <span className="font-medium text-gray-900">{addOn.name}</span>
                      </div>
                      <div className="flex items-center space-x-3 text-sm">
                        <span className="text-gray-500">+{addOn.duration} min</span>
                        <span className="font-medium text-green-600">+${addOn.price}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5 ml-7">{addOn.description}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Total Summary */}
      {selectedService && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-lg font-semibold text-gray-900">{calculateTotalDuration()} minutes</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Price</p>
              <p className="text-2xl font-bold text-olive-600">${calculateTotalPrice()}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          onClick={handleContinue}
          disabled={!selectedService}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            selectedService
              ? 'bg-olive-600 text-white hover:bg-olive-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Select Time
        </button>
      </div>
    </div>
  )
}