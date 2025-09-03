'use client'

import { useState } from 'react'
import {
  UserGroupIcon,
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  SparklesIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function PaymentModelSelector({ onModelSelect, currentModel = null }) {
  const [selectedModel, setSelectedModel] = useState(currentModel)
  const [showDetails, setShowDetails] = useState(false)

  const paymentModels = [
    {
      id: 'commission',
      name: 'Commission-Based',
      icon: UserGroupIcon,
      description: 'Traditional employee model with centralized payments',
      color: 'blue',
      features: [
        'Shop processes all payments',
        'Barbers receive commission (40-70%)',
        'Shop handles taxes (W2 employees)',
        'Simplified payment management',
        'One Stripe account for the shop'
      ],
      requirements: [
        'Shop owner sets up Stripe',
        'Barbers are employees',
        'Shop manages all financial reporting'
      ],
      bestFor: 'Traditional barbershops with employed barbers',
      taxModel: 'W2 Employee',
      revenueFlow: 'Centralized through shop'
    },
    {
      id: 'booth_rental',
      name: 'Booth Rental',
      icon: BuildingStorefrontIcon,
      description: 'Independent contractor model with individual payment processing',
      color: 'green',
      features: [
        'Each barber processes own payments',
        'Barbers keep 100% of service revenue',
        'Barbers pay fixed booth rent',
        'Independent tax filing (1099)',
        'Each barber has own Stripe account'
      ],
      requirements: [
        'Each barber sets up Stripe',
        'Barbers are independent contractors',
        'Barbers handle own taxes'
      ],
      bestFor: 'Modern shops with independent barbers',
      taxModel: '1099 Independent Contractor',
      revenueFlow: 'Direct to barbers'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Model',
      icon: SparklesIcon,
      description: 'Flexible model supporting both employees and contractors',
      color: 'purple',
      features: [
        'Mix of commission and booth rental',
        'Some services through shop, some through barbers',
        'Flexible payment routing',
        'Supports different barber arrangements',
        'Multiple Stripe accounts'
      ],
      requirements: [
        'Shop and some barbers set up Stripe',
        'Clear payment routing rules',
        'Mixed tax handling'
      ],
      bestFor: 'Shops transitioning or offering flexibility',
      taxModel: 'Mixed (W2 and 1099)',
      revenueFlow: 'Both centralized and direct'
    }
  ]

  const handleModelSelect = (model) => {
    setSelectedModel(model.id)
    if (onModelSelect) {
      onModelSelect(model)
    }
  }

  const getModelById = (id) => paymentModels.find(m => m.id === id)

  return (
    <div className="space-y-6">
      {/* Model Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {paymentModels.map((model) => (
          <button
            key={model.id}
            onClick={() => handleModelSelect(model)}
            className={`
              relative p-6 rounded-xl border-2 transition-all text-left
              ${selectedModel === model.id 
                ? `border-${model.color}-500 bg-${model.color}-50 shadow-lg` 
                : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-md'
              }
            `}
          >
            {/* Selected Indicator */}
            {selectedModel === model.id && (
              <div className="absolute top-2 right-2">
                <CheckCircleIcon className={`h-6 w-6 text-${model.color}-600`} />
              </div>
            )}

            {/* Icon */}
            <div className={`
              inline-flex p-3 rounded-lg mb-4
              ${selectedModel === model.id 
                ? `bg-${model.color}-100` 
                : 'bg-gray-100'
              }
            `}>
              <model.icon className={`
                h-8 w-8
                ${selectedModel === model.id 
                  ? `text-${model.color}-600` 
                  : 'text-gray-600'
                }
              `} />
            </div>

            {/* Content */}
            <h3 className="text-lg font-semibold mb-2">{model.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{model.description}</p>
            
            {/* Tax Model Badge */}
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
              {model.taxModel}
            </div>
          </button>
        ))}
      </div>

      {/* Detailed Information */}
      {selectedModel && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 animate-fadeIn">
          {(() => {
            const model = getModelById(selectedModel)
            return (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      <model.icon className={`h-6 w-6 text-${model.color}-600`} />
                      {model.name} Model
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Best for: {model.bestFor}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                {showDetails && (
                  <div className="space-y-6">
                    {/* Features */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Features</h4>
                      <ul className="space-y-2">
                        {model.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Requirements */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Requirements</h4>
                      <ul className="space-y-2">
                        {model.requirements.map((req, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Revenue Flow */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Tax Model:</span>
                          <p className="font-medium">{model.taxModel}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Revenue Flow:</span>
                          <p className="font-medium">{model.revenueFlow}</p>
                        </div>
                      </div>
                    </div>

                    {/* Model-Specific Warnings */}
                    {model.id === 'booth_rental' && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex gap-2">
                          <InformationCircleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                          <div className="text-sm text-yellow-800">
                            <p className="font-medium mb-1">Important Tax Consideration</p>
                            <p>Booth renters pay ~7.5% more in self-employment taxes compared to W2 employees. Some states don't allow booth rental models.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {model.id === 'hybrid' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex gap-2">
                          <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div className="text-sm text-blue-800">
                            <p className="font-medium mb-1">Complexity Notice</p>
                            <p>This model requires careful setup of payment routing rules and clear agreements with each barber about their status.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      )}

      {/* Statistics from Research */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Industry Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">40%</p>
            <p className="text-xs text-gray-600">Use Commission</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">50%</p>
            <p className="text-xs text-gray-600">Use Booth Rental</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">10%</p>
            <p className="text-xs text-gray-600">Use Hybrid</p>
          </div>
        </div>
      </div>
    </div>
  )
}