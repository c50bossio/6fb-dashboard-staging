'use client'

import { useState, useEffect } from 'react'
import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  CalculatorIcon,
  CalendarIcon,
  PencilIcon,
  PlusIcon,
  ChartBarIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function FinancialArrangements() {
  const [arrangements, setArrangements] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showArrangementModal, setShowArrangementModal] = useState(false)
  const [editingArrangement, setEditingArrangement] = useState(null)
  const [metrics, setMetrics] = useState({
    totalCommissions: 0,
    totalBoothRent: 0,
    pendingPayouts: 0,
    completedPayouts: 0
  })

  useEffect(() => {
    loadFinancialData()
  }, [])

  const loadFinancialData = async () => {
    try {
      // Load financial arrangements
      const arrangementsResponse = await fetch('/api/shop/financial/arrangements')
      if (arrangementsResponse.ok) {
        const data = await arrangementsResponse.json()
        setArrangements(data.arrangements || [])
        setMetrics(data.metrics || {
          totalCommissions: 0,
          totalBoothRent: 0,
          pendingPayouts: 0,
          completedPayouts: 0
        })
      }

      // Load barbers for the dropdown
      const barbersResponse = await fetch('/api/shop/barbers')
      if (barbersResponse.ok) {
        const { barbers } = await barbersResponse.json()
        setBarbers(barbers || [])
      }
    } catch (error) {
      console.error('Error loading financial data:', error)
      setError('Failed to load financial data. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveArrangement = async (arrangementData) => {
    try {
      const url = editingArrangement 
        ? `/api/shop/financial/arrangements/${editingArrangement.id}`
        : '/api/shop/financial/arrangements'
      
      const method = editingArrangement ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(arrangementData)
      })
      
      if (response.ok) {
        loadFinancialData()
        setShowArrangementModal(false)
        setEditingArrangement(null)
        alert('Financial arrangement saved successfully!')
      } else {
        alert('Failed to save arrangement. Please try again.')
      }
    } catch (error) {
      console.error('Error saving arrangement:', error)
      alert('An error occurred while saving. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-2">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              loadFinancialData()
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Financial Arrangements</h1>
        <p className="text-gray-600 mt-2">Manage commission structures and booth rent agreements</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.totalCommissions.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Monthly Commissions</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-olive-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-olive-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.totalBoothRent.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Monthly Booth Rent</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-amber-800" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.pendingPayouts.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Pending Payouts</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-gold-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-gold-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              ${metrics.completedPayouts.toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-2">Completed Payouts</p>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Active Arrangements</h2>
          <button
            onClick={() => setShowArrangementModal(true)}
            className="px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Arrangement
          </button>
        </div>
      </div>

      {/* Arrangements List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Barber
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Terms
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {arrangements.map((arrangement) => (
              <tr key={arrangement.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {arrangement.barber_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {arrangement.barber_email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    arrangement.type === 'commission' 
                      ? 'bg-moss-100 text-moss-900'
                      : arrangement.type === 'booth_rent'
                      ? 'bg-olive-100 text-olive-800'
                      : 'bg-gold-100 text-gold-800'
                  }`}>
                    {arrangement.type === 'commission' ? 'Commission' :
                     arrangement.type === 'booth_rent' ? 'Booth Rent' : 'Hybrid'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {arrangement.type === 'commission' && (
                      <span>{arrangement.commission_percentage}% Commission</span>
                    )}
                    {arrangement.type === 'booth_rent' && (
                      <span>${arrangement.booth_rent_amount}/{arrangement.booth_rent_frequency}</span>
                    )}
                    {arrangement.type === 'hybrid' && (
                      <div>
                        <div>{arrangement.commission_percentage}% + </div>
                        <div>${arrangement.booth_rent_amount}/{arrangement.booth_rent_frequency}</div>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {arrangement.product_commission_percentage}% product commission
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{arrangement.payment_frequency}</div>
                  <div className="text-xs text-gray-500">{arrangement.payment_method}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    arrangement.is_active 
                      ? 'bg-moss-100 text-moss-900'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {arrangement.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => {
                      setEditingArrangement(arrangement)
                      setShowArrangementModal(true)
                    }}
                    className="text-olive-600 hover:text-indigo-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {arrangements.length === 0 && (
          <div className="text-center py-12">
            <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No financial arrangements set up yet</p>
            <button
              onClick={() => setShowArrangementModal(true)}
              className="inline-flex items-center px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create First Arrangement
            </button>
          </div>
        )}
      </div>

      {/* Arrangement Modal */}
      {showArrangementModal && (
        <ArrangementModal
          arrangement={editingArrangement}
          barbers={barbers}
          onSave={handleSaveArrangement}
          onClose={() => {
            setShowArrangementModal(false)
            setEditingArrangement(null)
          }}
        />
      )}
    </div>
  )
}

function ArrangementModal({ arrangement, barbers, onSave, onClose }) {
  const [formData, setFormData] = useState({
    barber_id: arrangement?.barber_id || '',
    type: arrangement?.type || 'commission',
    commission_percentage: arrangement?.commission_percentage || 60,
    booth_rent_amount: arrangement?.booth_rent_amount || 0,
    booth_rent_frequency: arrangement?.booth_rent_frequency || 'weekly',
    product_commission_percentage: arrangement?.product_commission_percentage || 10,
    payment_method: arrangement?.payment_method || 'direct_deposit',
    payment_frequency: arrangement?.payment_frequency || 'weekly',
    is_active: arrangement?.is_active !== false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {arrangement ? 'Edit Financial Arrangement' : 'New Financial Arrangement'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Barber Selection */}
            {!arrangement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Barber *
                </label>
                <select
                  required
                  value={formData.barber_id}
                  onChange={(e) => setFormData({...formData, barber_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Choose a barber...</option>
                  {barbers.map(barber => (
                    <option key={barber.id} value={barber.user_id || barber.id}>
                      {barber.users?.full_name || barber.users?.email || 'Unnamed Barber'}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {/* Arrangement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrangement Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="commission">Commission Based</option>
                <option value="booth_rent">Booth Rent</option>
                <option value="hybrid">Hybrid (Commission + Booth Rent)</option>
              </select>
            </div>
            
            {/* Commission Settings */}
            {(formData.type === 'commission' || formData.type === 'hybrid') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Commission Percentage *
                </label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.commission_percentage}
                    onChange={(e) => setFormData({...formData, commission_percentage: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="ml-2 text-gray-600">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Barber keeps this percentage of service revenue
                </p>
              </div>
            )}
            
            {/* Booth Rent Settings */}
            {(formData.type === 'booth_rent' || formData.type === 'hybrid') && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Booth Rent Amount *
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-600">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={formData.booth_rent_amount}
                      onChange={(e) => setFormData({...formData, booth_rent_amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Frequency *
                  </label>
                  <select
                    required
                    value={formData.booth_rent_frequency}
                    onChange={(e) => setFormData({...formData, booth_rent_frequency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Product Commission */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Sales Commission
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.product_commission_percentage}
                  onChange={(e) => setFormData({...formData, product_commission_percentage: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
                <span className="ml-2 text-gray-600">%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Commission on retail product sales
              </p>
            </div>
            
            {/* Payment Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="venmo">Venmo</option>
                  <option value="cashapp">CashApp</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Frequency
                </label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({...formData, payment_frequency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            
            {/* Active Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Arrangement is active
              </label>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700"
              >
                {arrangement ? 'Update Arrangement' : 'Create Arrangement'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}