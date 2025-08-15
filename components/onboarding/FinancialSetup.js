'use client'

import { useState } from 'react'
import { 
  CreditCardIcon, 
  BanknotesIcon,
  CalculatorIcon,
  BuildingLibraryIcon,
  UsersIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'

export default function FinancialSetup({ onComplete, initialData = {}, subscriptionTier = 'shop' }) {
  const [currentSection, setCurrentSection] = useState('payment')
  const [formData, setFormData] = useState({
    stripeConnected: initialData.stripeConnected || false,
    depositSchedule: initialData.depositSchedule || 'daily',
    acceptedPayments: initialData.acceptedPayments || ['card', 'cash'],
    
    payoutModel: initialData.payoutModel || 'commission', // commission, booth_rent, hybrid
    commissionRate: initialData.commissionRate || 60,
    weeklyBoothRent: initialData.weeklyBoothRent || 150,
    hybridMinCommission: initialData.hybridMinCommission || 40,
    hybridBoothRent: initialData.hybridBoothRent || 75,
    tipDistribution: initialData.tipDistribution || 'barber_keeps_all',
    
    hairCutPrice: initialData.hairCutPrice || 35,
    beardTrimPrice: initialData.beardTrimPrice || 20,
    washAndStylePrice: initialData.washAndStylePrice || 45,
    premiumServiceRate: initialData.premiumServiceRate || 1.5,
    
    businessTaxId: initialData.businessTaxId || '',
    salesTaxRate: initialData.salesTaxRate || 8.25,
    staffClassification: initialData.staffClassification || 'contractor',
    
    bankingSetup: initialData.bankingSetup || 'later',
    accountingIntegration: initialData.accountingIntegration || 'none'
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleArrayToggle = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value) 
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }))
  }

  const sections = [
    { id: 'payment', label: 'Payment Processing', icon: CreditCardIcon },
    { id: 'payout', label: 'Payout Model', icon: UsersIcon },
    { id: 'pricing', label: 'Service Pricing', icon: CurrencyDollarIcon },
    { id: 'business', label: 'Business Details', icon: BuildingLibraryIcon }
  ]

  const handleComplete = () => {
    onComplete(formData)
  }

  const canProceed = () => {
    switch (currentSection) {
      case 'payment':
        return formData.depositSchedule && formData.acceptedPayments.length > 0
      case 'payout':
        if (formData.payoutModel === 'commission') {
          return formData.commissionRate > 0
        } else if (formData.payoutModel === 'booth_rent') {
          return formData.weeklyBoothRent > 0
        } else if (formData.payoutModel === 'hybrid') {
          return formData.hybridMinCommission > 0 && formData.hybridBoothRent > 0
        }
        return true
      case 'pricing':
        return formData.hairCutPrice > 0
      case 'business':
        return formData.salesTaxRate >= 0
      default:
        return true
    }
  }

  const nextSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex < sections.length - 1) {
      setCurrentSection(sections[currentIndex + 1].id)
    } else {
      handleComplete()
    }
  }

  const prevSection = () => {
    const currentIndex = sections.findIndex(s => s.id === currentSection)
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1].id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Section Navigation */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Financial Setup</h2>
          <div className="text-sm text-gray-500">
            {sections.findIndex(s => s.id === currentSection) + 1} of {sections.length}
          </div>
        </div>
        
        <div className="flex space-x-1 mb-6">
          {sections.map((section, index) => {
            const Icon = section.icon
            const isActive = section.id === currentSection
            const isCompleted = sections.findIndex(s => s.id === currentSection) > index
            
            return (
              <div
                key={section.id}
                className={`flex-1 flex items-center justify-center py-3 px-2 rounded-lg border-2 transition-all ${
                  isActive 
                    ? 'border-olive-500 bg-olive-50 text-olive-700'
                    : isCompleted
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 bg-gray-50 text-gray-500'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium hidden sm:inline">{section.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Payment Processing Section */}
      {currentSection === 'payment' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Processing</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Schedule
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['daily', 'weekly'].map((schedule) => (
                    <button
                      key={schedule}
                      onClick={() => handleInputChange('depositSchedule', schedule)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.depositSchedule === schedule
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {schedule.charAt(0).toUpperCase() + schedule.slice(1)} Deposits
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accepted Payment Methods
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'card', label: 'Credit/Debit Cards' },
                    { id: 'cash', label: 'Cash' },
                    { id: 'digital', label: 'Digital Wallets' },
                    { id: 'check', label: 'Checks' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => handleArrayToggle('acceptedPayments', method.id)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.acceptedPayments.includes(method.id)
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Model Section */}
      {currentSection === 'payout' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How do you pay your barbers?</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select your payout model
                </label>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { 
                      id: 'commission', 
                      label: 'Commission Only', 
                      description: 'Barbers earn a percentage of each service (e.g., 60% of $35 haircut = $21)',
                      icon: '💰',
                      popular: true
                    },
                    { 
                      id: 'booth_rent', 
                      label: 'Booth Rent Only', 
                      description: 'Barbers pay weekly rent and keep 100% of their earnings',
                      icon: '🏪',
                      popular: false
                    },
                    { 
                      id: 'hybrid', 
                      label: 'Hybrid Model', 
                      description: 'Lower booth rent + reduced commission (best of both worlds)',
                      icon: '⚖️',
                      popular: false
                    }
                  ].map((model) => (
                    <div
                      key={model.id}
                      onClick={() => handleInputChange('payoutModel', model.id)}
                      className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.payoutModel === model.id
                          ? 'border-olive-500 bg-olive-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {model.popular && (
                        <span className="absolute -top-2 left-4 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          Most Popular
                        </span>
                      )}
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{model.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{model.label}</h4>
                          <p className="text-sm text-gray-600 mt-1">{model.description}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.payoutModel === model.id
                            ? 'border-olive-500 bg-olive-500'
                            : 'border-gray-300'
                        }`}>
                          {formData.payoutModel === model.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commission Model Details */}
              {formData.payoutModel === 'commission' && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Commission Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commission Rate (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.commissionRate}
                        onChange={(e) => handleInputChange('commissionRate', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                        placeholder="60"
                      />
                      <span className="absolute right-3 top-3 text-gray-500">%</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Example: 60% commission on $35 haircut = $21 to barber, $14 to shop
                    </p>
                  </div>
                </div>
              )}

              {/* Booth Rent Model Details */}
              {formData.payoutModel === 'booth_rent' && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Booth Rent Details</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Booth Rent ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.weeklyBoothRent}
                      onChange={(e) => handleInputChange('weeklyBoothRent', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                      placeholder="150"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Barber pays this amount weekly and keeps 100% of their earnings
                    </p>
                  </div>
                </div>
              )}

              {/* Hybrid Model Details */}
              {formData.payoutModel === 'hybrid' && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-gray-900">Hybrid Model Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reduced Weekly Rent ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.hybridBoothRent}
                        onChange={(e) => handleInputChange('hybridBoothRent', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                        placeholder="75"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Commission (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.hybridMinCommission}
                          onChange={(e) => handleInputChange('hybridMinCommission', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                          placeholder="40"
                        />
                        <span className="absolute right-3 top-3 text-gray-500">%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Lower weekly rent + commission only if earnings exceed the rent amount
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tip Distribution
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'barber_keeps_all', label: 'Barber keeps 100% of tips' },
                    { id: 'shop_split', label: 'Split with shop (80/20)' },
                    { id: 'team_pool', label: 'Pool tips among all staff' }
                  ].map((option) => (
                    <label key={option.id} className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="tipDistribution"
                        value={option.id}
                        checked={formData.tipDistribution === option.id}
                        onChange={(e) => handleInputChange('tipDistribution', e.target.value)}
                        className="w-4 h-4 text-olive-600 border-gray-300 focus:ring-olive-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Pricing Section */}
      {currentSection === 'pricing' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Pricing</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Haircut ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.hairCutPrice}
                  onChange={(e) => handleInputChange('hairCutPrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="35"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beard Trim ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.beardTrimPrice}
                  onChange={(e) => handleInputChange('beardTrimPrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wash & Style ($)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.washAndStylePrice}
                  onChange={(e) => handleInputChange('washAndStylePrice', parseInt(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Premium Service Multiplier
                </label>
                <select
                  value={formData.premiumServiceRate}
                  onChange={(e) => handleInputChange('premiumServiceRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                >
                  <option value={1.25}>1.25x (+25%)</option>
                  <option value={1.5}>1.5x (+50%)</option>
                  <option value={1.75}>1.75x (+75%)</option>
                  <option value={2}>2x (+100%)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Business Details Section */}
      {currentSection === 'business' && (
        <div className="space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Tax ID (EIN) - Optional
                </label>
                <input
                  type="text"
                  value={formData.businessTaxId}
                  onChange={(e) => handleInputChange('businessTaxId', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="12-3456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.01"
                  value={formData.salesTaxRate}
                  onChange={(e) => handleInputChange('salesTaxRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                  placeholder="8.25"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff Classification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'contractor', label: '1099 Contractor' },
                    { id: 'employee', label: 'W2 Employee' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleInputChange('staffClassification', type.id)}
                      className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                        formData.staffClassification === type.id
                          ? 'border-olive-500 bg-olive-50 text-olive-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accounting Integration
                </label>
                <select
                  value={formData.accountingIntegration}
                  onChange={(e) => handleInputChange('accountingIntegration', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-olive-500 focus:outline-none"
                >
                  <option value="none">Set up later</option>
                  <option value="quickbooks">QuickBooks</option>
                  <option value="xero">Xero</option>
                  <option value="freshbooks">FreshBooks</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-8">
        <button
          onClick={prevSection}
          disabled={currentSection === 'payment'}
          className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-lg font-medium hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>

        <div className="text-center">
          <button
            onClick={() => onComplete(formData)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Skip for now
          </button>
        </div>

        <button
          onClick={nextSection}
          disabled={!canProceed()}
          className="px-6 py-3 bg-olive-600 hover:bg-olive-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors"
        >
          {currentSection === 'business' ? 'Complete Setup' : 'Next'}
        </button>
      </div>
    </div>
  )
}