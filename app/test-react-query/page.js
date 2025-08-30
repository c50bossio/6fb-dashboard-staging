'use client'

/**
 * Test Page for React Query Implementation
 * Phase 3-4: Verify hooks are working correctly
 */

import { useState } from 'react'
import { useRealtimeAppointments, useCreateAppointment } from '@/hooks/queries/useAppointments'
import { useDashboardData } from '@/hooks/queries/useDashboard'
import { useServices, useCreateService, useUpdateService } from '@/hooks/queries/useServices'

// Test barbershop ID from our migration
const TEST_BARBERSHOP_ID = 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9'

export default function ReactQueryTestPage() {
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  
  // Test our query hooks
  const { data: services, isLoading: servicesLoading, error: servicesError, refetch: refetchServices } = useServices(TEST_BARBERSHOP_ID)
  const { data: appointments, isLoading: appointmentsLoading } = useRealtimeAppointments(TEST_BARBERSHOP_ID)
  const dashboardData = useDashboardData(TEST_BARBERSHOP_ID)
  
  // Log errors for debugging
  if (servicesError) {
    console.error('Services query error:', servicesError)
  }
  
  // Test our mutation hooks
  const createService = useCreateService()
  const updateService = useUpdateService()
  const createAppointment = useCreateAppointment()
  
  const handleCreateService = () => {
    if (!newServiceName || !newServicePrice) return
    
    createService.mutate({
      barberbarbershop_id: TEST_BARBERSHOP_ID,
      name: newServiceName,
      price: parseFloat(newServicePrice),
      duration_minutes: 30,
      active: true,
      category: 'test',
      description: 'Test service created via React Query'
    })
    
    setNewServiceName('')
    setNewServicePrice('')
  }
  
  const handleToggleService = (service) => {
    updateService.mutate({
      serviceId: service.id,
      barberbarbershop_id: TEST_BARBERSHOP_ID,
      updates: {
        active: !service.active
      }
    })
  }
  
  const handleCreateTestAppointment = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0)
    
    createAppointment.mutate({
      barberbarbershop_id: TEST_BARBERSHOP_ID,
      customer_name: 'Test Customer',
      customer_phone: '555-0123',
      customer_email: 'test@example.com',
      service_name: 'Test Service',
      start_time: tomorrow.toISOString(),
      end_time: new Date(tomorrow.getTime() + 30 * 60000).toISOString(),
      duration_minutes: 30,
      price: 50,
      status: 'confirmed'
    })
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">React Query Test Page</h1>
        
        {/* Phase 3-4 Implementation Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Phase 3-4 Implementation Status</h2>
          <ul className="text-green-700 space-y-1">
            <li>✓ React Query installed and configured</li>
            <li>✓ Query client with optimized cache settings</li>
            <li>✓ Services hooks with mutations</li>
            <li>✓ Appointments hooks with real-time support</li>
            <li>✓ Dashboard data aggregation hooks</li>
            <li>✓ React Query DevTools integrated</li>
          </ul>
        </div>
        
        {/* Services Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Services (useServices Hook)</h2>
          
          {servicesLoading ? (
            <p>Loading services...</p>
          ) : servicesError ? (
            <p className="text-red-600">Error: {servicesError.message}</p>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Service name"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  className="px-3 py-2 border rounded w-24"
                />
                <button
                  onClick={handleCreateService}
                  disabled={createService.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {createService.isPending ? 'Creating...' : 'Add Service'}
                </button>
              </div>
              
              <div className="space-y-2">
                {services?.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <span className="font-medium">{service.name}</span>
                      <span className="ml-2 text-gray-600">${service.price}</span>
                      <span className={`ml-2 px-2 py-1 text-xs rounded ${
                        service.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {service.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleService(service)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      Toggle Status
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* Appointments Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Real-time Appointments (useRealtimeAppointments Hook)
          </h2>
          
          <div className="mb-4">
            <button
              onClick={handleCreateTestAppointment}
              disabled={createAppointment.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {createAppointment.isPending ? 'Creating...' : 'Create Test Appointment'}
            </button>
          </div>
          
          {appointmentsLoading ? (
            <p>Loading appointments...</p>
          ) : (
            <div className="space-y-2">
              {appointments?.length === 0 ? (
                <p className="text-gray-500">No appointments found</p>
              ) : (
                appointments?.map(apt => (
                  <div key={apt.id} className="p-3 border rounded">
                    <div className="flex justify-between">
                      <span className="font-medium">{apt.customer_name || 'No name'}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        apt.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        apt.status === 'completed' ? 'bg-green-100 text-green-800' :
                        apt.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {apt.service_name} • {new Date(apt.start_time).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <p className="text-sm text-gray-500 mt-2">
            💡 Real-time updates enabled - changes will appear automatically
          </p>
        </div>
        
        {/* Dashboard Metrics Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Dashboard Data (useDashboardData Hook)</h2>
          
          {dashboardData.isLoading ? (
            <p>Loading dashboard data...</p>
          ) : dashboardData.isError ? (
            <p className="text-red-600">Error loading dashboard</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <div className="text-2xl font-bold">{dashboardData.derivedMetrics.todayAppointments}</div>
                <div className="text-sm text-gray-600">Today's Appointments</div>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold">{dashboardData.derivedMetrics.activeServices}</div>
                <div className="text-sm text-gray-600">Active Services</div>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <div className="text-2xl font-bold">{dashboardData.derivedMetrics.activeStaff}</div>
                <div className="text-sm text-gray-600">Active Staff</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded">
                <div className="text-2xl font-bold">${dashboardData.metrics?.totalRevenue || 0}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
            </div>
          )}
        </div>
        
        {/* DevTools Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-sm">
          <p className="font-semibold mb-2">🛠️ Developer Tools:</p>
          <ul className="space-y-1 text-gray-700">
            <li>• React Query DevTools available in bottom-right corner</li>
            <li>• Open DevTools to see cache, queries, and mutations</li>
            <li>• All queries are automatically cached and deduplicated</li>
            <li>• Optimistic updates provide instant UI feedback</li>
          </ul>
        </div>
      </div>
    </div>
  )
}