'use client'

import {
  ScissorsIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon,
  ChartBarIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import marketIntelligence from '@/services/MarketIntelligenceService'

const serviceTemplates = {
  barbershop: [
    { name: 'Haircut', duration: 30, price: 35, icon: '✂️', description: 'Classic haircut and style' },
    { name: 'Fade Cut', duration: 45, price: 40, icon: '💈', description: 'Precision fade with styling' },
    { name: 'Beard Trim', duration: 20, price: 20, icon: '🧔', description: 'Beard shaping and trim' },
    { name: 'Kids Cut', duration: 20, price: 25, icon: '👶', description: 'Children under 12' },
    { name: 'Hot Towel Shave', duration: 30, price: 30, icon: '🔥', description: 'Traditional hot towel shave' },
    { name: 'VIP Package', duration: 50, price: 55, icon: '👑', description: 'Premium grooming experience' }
  ],
  salon: [
    { name: 'Men\'s Haircut', duration: 30, price: 45, icon: '✂️', description: 'Cut and style' },
    { name: 'Hair Color', duration: 90, price: 85, icon: '🎨', description: 'Full color service' },
    { name: 'Highlights', duration: 120, price: 120, icon: '✨', description: 'Partial or full highlights' },
    { name: 'Hair Treatment', duration: 45, price: 60, icon: '💆', description: 'Deep conditioning treatment' }
  ],
  premium: [
    { name: 'Executive Cut', duration: 45, price: 65, icon: '👔', description: 'Premium cut with consultation' },
    { name: 'Grooming Package', duration: 75, price: 95, icon: '🌟', description: 'Haircut, beard, hot towel' },
    { name: 'VIP Experience', duration: 90, price: 150, icon: '👑', description: 'Full service with massage' }
  ]
}

export default function ServiceSetup({ onComplete, initialData = {}, businessType = 'barbershop', location = null }) {
  const [services, setServices] = useState(initialData.services || [])
  const [customService, setCustomService] = useState({ name: '', duration: 30, price: 0 })
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [pricingSuggestion, setPricingSuggestion] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [loadingMarketData, setLoadingMarketData] = useState(false)
  
  const templates = serviceTemplates[businessType] || serviceTemplates.barbershop

  useEffect(() => {
    if (services.length === 0 && initialData.useQuickStartPack !== false) {
      // Quick Start Pack: Auto-select all 6 essential barbershop services
      const quickStartServices = templates.slice(0, 6).map(template => ({
        ...template,
        id: Math.random().toString(36).substr(2, 9),
        selected: true
      }))
      setServices(quickStartServices)
    }
  }, [])

  useEffect(() => {
    if (location && location.lat && location.lng) {
      fetchMarketIntelligence()
    }
  }, [location])

  const fetchMarketIntelligence = async () => {
    setLoadingMarketData(true)
    try {
      const intelligence = await marketIntelligence.getMarketIntelligence(location, businessType)
      setMarketData(intelligence)
      
      // Update service prices with market recommendations
      if (intelligence.prices) {
        const updatedServices = services.map(service => {
          const marketPrice = intelligence.prices[service.name]
          if (marketPrice) {
            return {
              ...service,
              price: marketPrice.recommended,
              marketPrice: marketPrice
            }
          }
          return service
        })
        setServices(updatedServices)
      }
      
      // Format pricing suggestion for display
      if (intelligence.prices) {
        const suggestion = {
          message: `Market rates for ${location.city || 'your area'}:`,
          confidence: intelligence.marketAnalysis?.confidence || 0.7,
          strategy: intelligence.marketAnalysis?.pricingStrategy,
          insights: intelligence.insights
        }
        setPricingSuggestion(suggestion)
      }
    } catch (error) {
      console.error('Failed to fetch market intelligence:', error)
      // Fallback to basic suggestion
      setPricingSuggestion({
        message: 'Using standard market rates',
        confidence: 0.5
      })
    } finally {
      setLoadingMarketData(false)
    }
  }

  const handleToggleService = (template) => {
    const existingIndex = services.findIndex(s => s.name === template.name)
    
    if (existingIndex >= 0) {
      setServices(services.filter((_, i) => i !== existingIndex))
    } else {
      setServices([...services, {
        ...template,
        id: Math.random().toString(36).substr(2, 9),
        selected: true
      }])
    }
  }

  const handlePriceChange = (serviceId, newPrice) => {
    setServices(services.map(s => 
      s.id === serviceId ? { ...s, price: parseFloat(newPrice) || 0 } : s
    ))
  }

  const handleDurationChange = (serviceId, newDuration) => {
    setServices(services.map(s => 
      s.id === serviceId ? { ...s, duration: parseInt(newDuration) || 30 } : s
    ))
  }

  const handleAddCustomService = () => {
    if (customService.name && customService.price > 0) {
      setServices([...services, {
        ...customService,
        id: Math.random().toString(36).substr(2, 9),
        icon: '⭐',
        selected: true,
        custom: true
      }])
      setCustomService({ name: '', duration: 30, price: 0 })
      setShowCustomForm(false)
    }
  }

  const handleRemoveService = (serviceId) => {
    setServices(services.filter(s => s.id !== serviceId))
  }

  const handleContinue = () => {
    if (services.length > 0) {
      onComplete({ services })
    }
  }

  const isServiceSelected = (name) => {
    return services.some(s => s.name === name)
  }

  return (
    <div className="space-y-6">
      {/* AI Market Intelligence */}
      {loadingMarketData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-sm text-blue-900">Analyzing local market rates...</span>
          </div>
        </div>
      )}
      
      {marketData && (
        <div className="space-y-4">
          {/* Market Intelligence Summary */}
          <div className="bg-gradient-to-r from-olive-50 to-green-50 border border-olive-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center">
                <ChartBarIcon className="w-5 h-5 text-olive-600 mr-2" />
                <h3 className="font-semibold text-olive-900">Market Intelligence</h3>
              </div>
              {marketData.marketAnalysis?.confidence && (
                <div className="flex items-center text-xs">
                  <span className="text-gray-600 mr-1">Confidence:</span>
                  <div className="flex space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 w-2 rounded-full ${
                          i < Math.round(marketData.marketAnalysis.confidence * 5)
                            ? 'bg-green-500'
                            : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Pricing Recommendations */}
            {marketData.prices && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {Object.entries(marketData.prices).slice(0, 6).map(([service, pricing]) => (
                  <div key={service} className="bg-white rounded-md p-2">
                    <div className="text-xs text-gray-600">{service}</div>
                    <div className="font-semibold text-gray-900">${pricing.recommended}</div>
                    <div className="text-xs text-gray-500">
                      ${pricing.range.min}-${pricing.range.max}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Market Analysis */}
            {marketData.marketAnalysis && (
              <div className="border-t border-olive-200 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Market Saturation:</span>
                  <span className={`font-medium ${
                    marketData.marketAnalysis.marketSaturation === 'low' ? 'text-green-600' :
                    marketData.marketAnalysis.marketSaturation === 'moderate' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {marketData.marketAnalysis.marketSaturation}
                  </span>
                </div>
                
                {marketData.marketAnalysis.competitorCount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Nearby Competitors:</span>
                    <span className="font-medium text-gray-900">
                      {marketData.marketAnalysis.competitorCount} shops
                    </span>
                  </div>
                )}
                
                {marketData.marketAnalysis.pricingStrategy && (
                  <div className="mt-2 p-2 bg-olive-100 rounded-md">
                    <div className="text-xs font-semibold text-olive-900 mb-1">
                      Recommended Strategy: {marketData.marketAnalysis.pricingStrategy.strategy}
                    </div>
                    <div className="text-xs text-olive-700">
                      {marketData.marketAnalysis.pricingStrategy.description}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Market Insights */}
          {marketData.insights && marketData.insights.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-900">Market Insights</h4>
              </div>
              <div className="space-y-2">
                {marketData.insights.slice(0, 3).map((insight, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex items-start">
                      <span className={`inline-block w-2 h-2 rounded-full mt-1.5 mr-2 ${
                        insight.priority === 'high' ? 'bg-red-500' :
                        insight.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`} />
                      <div>
                        <div className="text-gray-900">{insight.message}</div>
                        {insight.action && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            → {insight.action}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Competitor Analysis */}
          {marketData.competitors && marketData.competitors.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <UserGroupIcon className="w-5 h-5 text-gray-600 mr-2" />
                <h4 className="font-medium text-gray-900">Top Competitors</h4>
              </div>
              <div className="space-y-1">
                {marketData.competitors.slice(0, 3).map((competitor, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{competitor.name}</span>
                    <div className="flex items-center space-x-2">
                      {competitor.rating && (
                        <span className="text-xs text-gray-600">
                          ⭐ {competitor.rating}
                        </span>
                      )}
                      {competitor.priceLevel && (
                        <span className="text-xs text-gray-600">
                          {'$'.repeat(competitor.priceLevel)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Select your services
            </h3>
            <p className="text-sm text-gray-600">
              Choose from common services or add your own
            </p>
          </div>
          {services.length < 6 && (
            <button
              onClick={() => {
                // Quick Start Pack: Add all 6 essential services
                const quickStartServices = templates.slice(0, 6).map(template => ({
                  ...template,
                  id: Math.random().toString(36).substr(2, 9),
                  selected: true,
                  marketPrice: marketData?.prices?.[template.name] || null
                }))
                setServices(quickStartServices)
              }}
              className="px-4 py-2 bg-gradient-to-r from-olive-600 to-green-600 text-white rounded-lg hover:from-olive-700 hover:to-green-700 transition-all shadow-md flex items-center space-x-2"
            >
              <SparklesIcon className="w-5 h-5" />
              <span className="font-medium">Quick Start Pack (6 Services)</span>
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((template, index) => {
            const isSelected = isServiceSelected(template.name)
            const isQuickStartService = index < 6 // First 6 services are Quick Start Pack
            return (
              <button
                key={template.name}
                onClick={() => handleToggleService(template)}
                className={`p-4 rounded-lg border-2 transition-all text-left relative ${
                  isSelected
                    ? 'border-olive-500 bg-olive-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {isQuickStartService && !isSelected && services.length === 0 && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Quick Start
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">{template.icon}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-xs text-gray-500">{template.description}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-600">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {template.duration} min
                        <span className="mx-2">•</span>
                        ${marketData?.prices?.[template.name]?.recommended || template.price}
                      </div>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-olive-500 bg-olive-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Services with Edit */}
      {services.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Your services ({services.length})
            </h3>
            {services.length === 6 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <SparklesIcon className="w-4 h-4 mr-1" />
                Quick Start Pack Active
              </span>
            )}
          </div>
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <span className="text-xl mr-3">{service.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{service.name}</h4>
                      {service.description && (
                        <p className="text-xs text-gray-500">{service.description}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Duration */}
                    <div className="flex items-center">
                      <ClockIcon className="w-4 h-4 text-gray-400 mr-1" />
                      <input
                        type="number"
                        value={service.duration}
                        onChange={(e) => handleDurationChange(service.id, e.target.value)}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded"
                        min="5"
                        step="5"
                      />
                      <span className="text-xs text-gray-500 ml-1">min</span>
                    </div>
                    
                    {/* Price */}
                    <div className="flex items-center">
                      <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mr-1" />
                      <input
                        type="number"
                        value={service.price}
                        onChange={(e) => handlePriceChange(service.id, e.target.value)}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded"
                        min="0"
                        step="5"
                      />
                    </div>
                    
                    {/* Remove */}
                    <button
                      onClick={() => handleRemoveService(service.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Service */}
      <div>
        {!showCustomForm ? (
          <button
            onClick={() => setShowCustomForm(true)}
            className="flex items-center text-olive-600 hover:text-olive-700 font-medium text-sm"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add custom service
          </button>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Add Custom Service</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Service name"
                value={customService.name}
                onChange={(e) => setCustomService({ ...customService, name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <div className="flex items-center">
                <ClockIcon className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="number"
                  placeholder="Duration"
                  value={customService.duration}
                  onChange={(e) => setCustomService({ ...customService, duration: parseInt(e.target.value) || 30 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  min="5"
                  step="5"
                />
                <span className="ml-2 text-sm text-gray-500">min</span>
              </div>
              <div className="flex items-center">
                <CurrencyDollarIcon className="w-4 h-4 text-gray-400 mr-2" />
                <input
                  type="number"
                  placeholder="Price"
                  value={customService.price}
                  onChange={(e) => setCustomService({ ...customService, price: parseFloat(e.target.value) || 0 })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  min="0"
                  step="5"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleAddCustomService}
                disabled={!customService.name || customService.price <= 0}
                className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 disabled:bg-gray-300"
              >
                Add Service
              </button>
              <button
                onClick={() => {
                  setShowCustomForm(false)
                  setCustomService({ name: '', duration: 30, price: 0 })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Status Display */}
      <div className="flex justify-center items-center pt-4">
        <div className="text-sm text-gray-500">
          {services.length} service{services.length !== 1 ? 's' : ''} configured
        </div>
      </div>
    </div>
  )
}