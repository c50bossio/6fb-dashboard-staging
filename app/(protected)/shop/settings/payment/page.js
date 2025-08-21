'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  CreditCardIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function PaymentMethodsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState(null)
  const [paymentMethods, setPaymentMethods] = useState([])
  
  const [formData, setFormData] = useState({
    accept_cash: true,
    accept_card: true,
    accept_digital: false,
    accept_checks: false,
    require_deposit: false,
    deposit_percentage: 25,
    cancellation_fee: 0,
    no_show_fee: 50
  })

  useEffect(() => {
    loadPaymentMethods()
  }, [user])

  const loadPaymentMethods = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Load from business_payment_methods table
      const { data: methods, error } = await supabase
        .from('business_payment_methods')
        .select('*')
        .eq('user_id', user.id)
      
      if (error && error.code !== 'PGRST116') {
        throw error
      }
      
      if (methods && methods.length > 0) {
        setPaymentMethods(methods)
        
        // Set form data based on existing methods
        const methodTypes = methods.map(m => m.method_type)
        setFormData({
          accept_cash: methodTypes.includes('cash'),
          accept_card: methodTypes.includes('card'),
          accept_digital: methodTypes.includes('digital'),
          accept_checks: methodTypes.includes('check'),
          require_deposit: methods.some(m => m.require_deposit),
          deposit_percentage: methods.find(m => m.deposit_percentage)?.deposit_percentage || 25,
          cancellation_fee: methods.find(m => m.cancellation_fee)?.cancellation_fee || 0,
          no_show_fee: methods.find(m => m.no_show_fee)?.no_show_fee || 50
        })
      }
    } catch (error) {
      console.error('Error loading payment methods:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load payment methods'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      // Clear existing methods for this user
      await supabase
        .from('business_payment_methods')
        .delete()
        .eq('user_id', user.id)
      
      // Insert new methods based on form selections
      const methodsToInsert = []
      
      if (formData.accept_cash) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'cash',
          enabled: true,
          require_deposit: formData.require_deposit,
          deposit_percentage: formData.deposit_percentage,
          cancellation_fee: formData.cancellation_fee,
          no_show_fee: formData.no_show_fee
        })
      }
      
      if (formData.accept_card) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'card',
          enabled: true,
          require_deposit: formData.require_deposit,
          deposit_percentage: formData.deposit_percentage
        })
      }
      
      if (formData.accept_digital) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'digital',
          enabled: true,
          require_deposit: formData.require_deposit
        })
      }
      
      if (formData.accept_checks) {
        methodsToInsert.push({
          user_id: user.id,
          method_type: 'check',
          enabled: true
        })
      }
      
      if (methodsToInsert.length > 0) {
        const { error } = await supabase
          .from('business_payment_methods')
          .insert(methodsToInsert)
        
        if (error) throw error
      }
      
      setNotification({
        type: 'success',
        message: 'Payment methods updated successfully'
      })
      
      // Reload data
      await loadPaymentMethods()
    } catch (error) {
      console.error('Error saving payment methods:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save payment methods'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Methods</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure which payment methods you accept and set deposit requirements
        </p>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CreditCardIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Accepted Payment Methods</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.accept_cash}
                  onChange={(e) => setFormData({...formData, accept_cash: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <BanknotesIcon className="h-5 w-5 text-gray-500 ml-3 mr-2" />
                <span className="text-sm text-gray-700">Cash payments</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.accept_card}
                  onChange={(e) => setFormData({...formData, accept_card: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <CreditCardIcon className="h-5 w-5 text-gray-500 ml-3 mr-2" />
                <span className="text-sm text-gray-700">Credit/Debit cards</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.accept_digital}
                  onChange={(e) => setFormData({...formData, accept_digital: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-8 text-sm text-gray-700">Digital payments (Venmo, PayPal, etc.)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.accept_checks}
                  onChange={(e) => setFormData({...formData, accept_checks: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-8 text-sm text-gray-700">Personal checks</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Deposit & Fees</h2>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.require_deposit}
                    onChange={(e) => setFormData({...formData, require_deposit: e.target.checked})}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Require deposit for bookings
                  </span>
                </label>
              </div>

              {formData.require_deposit && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deposit Percentage (%)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit_percentage}
                    onChange={(e) => setFormData({...formData, deposit_percentage: parseInt(e.target.value)})}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    min="0"
                    max="100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cancellation Fee (%)
                </label>
                <input
                  type="number"
                  value={formData.cancellation_fee}
                  onChange={(e) => setFormData({...formData, cancellation_fee: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  No-Show Fee (%)
                </label>
                <input
                  type="number"
                  value={formData.no_show_fee}
                  onChange={(e) => setFormData({...formData, no_show_fee: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-olive-600 hover:bg-olive-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}