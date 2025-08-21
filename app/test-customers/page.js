'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Test page to verify customer data without authentication
export default function TestCustomersPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadCustomers() {
      try {
        // Use the test API endpoint that has proper authentication
        const response = await fetch('/api/test-customers')
        const data = await response.json()

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to load customers')
        }

        setCustomers(data.customers || [])
        console.log('✅ Customers loaded:', data.customers?.length || 0)
        console.log('📊 Test info:', data.testInfo)
      } catch (err) {
        console.error('❌ Error loading customers:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadCustomers()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Customer Data Test Page</h1>
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4">Loading customers...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-800 font-semibold">
                ✅ Successfully loaded {customers.length} customers from the database!
              </p>
            </div>

            <div className="grid gap-4">
              {customers.map((customer) => (
                <div key={customer.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold">{customer.name}</h3>
                      <p className="text-gray-600">{customer.email}</p>
                      <p className="text-gray-600">{customer.phone}</p>
                      <div className="mt-2 flex gap-4 text-sm">
                        <span>Visits: {customer.total_visits || 0}</span>
                        <span>Spent: ${customer.total_spent || 0}</span>
                        {customer.vip_status && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">VIP</span>
                        )}
                      </div>
                      {customer.notes && (
                        <p className="mt-2 text-sm text-gray-500">Notes: {customer.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {customers.length === 0 && (
              <div className="text-center py-8 bg-white rounded-lg">
                <p className="text-gray-500">No customers found in the database.</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h2 className="font-semibold mb-2">Test Information:</h2>
          <ul className="text-sm space-y-1">
            <li>• Barbershop ID: c6261c6d-08e7-4e5f-89c3-ad3f3529caed</li>
            <li>• Direct database query (no authentication required for test)</li>
            <li>• This verifies the customer data exists and is accessible</li>
          </ul>
        </div>
      </div>
    </div>
  )
}