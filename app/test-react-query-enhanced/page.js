'use client'

/**
 * Enhanced Test Page for React Query Implementation
 * With Error Boundaries and Mock Data Support
 */

import { useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, Suspense } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useRealtimeAppointments, useCreateAppointment } from '@/hooks/queries/useAppointments'
import { useDashboardData } from '@/hooks/queries/useDashboard'
import { useServices, useCreateService, useUpdateService } from '@/hooks/queries/useServices'

// Test barbershop ID from our migration
const TEST_BARBERSHOP_ID = 'c61b33d5-4a96-472b-8f97-d1a3ae5532f9'

// Mock data for development testing
const MOCK_SERVICES = [
  { id: '1', name: 'Haircut', price: 30, active: true, duration_minutes: 30, category: 'hair' },
  { id: '2', name: 'Beard Trim', price: 20, active: true, duration_minutes: 20, category: 'beard' },
  { id: '3', name: 'Hot Shave', price: 35, active: true, duration_minutes: 45, category: 'shave' },
  { id: '4', name: 'Hair Color', price: 50, active: false, duration_minutes: 60, category: 'color' }
]

const MOCK_APPOINTMENTS = [
  { 
    id: '1', 
    customer_name: 'John Doe', 
    service_name: 'Haircut',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 5400000).toISOString(),
    status: 'confirmed',
    customer_phone: '555-0101',
    price: 30
  },
  { 
    id: '2', 
    customer_name: 'Jane Smith', 
    service_name: 'Beard Trim',
    start_time: new Date(Date.now() + 7200000).toISOString(),
    end_time: new Date(Date.now() + 8400000).toISOString(),
    status: 'confirmed',
    customer_phone: '555-0102',
    price: 20
  }
]

// Error Fallback Component
function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong:</h2>
      <pre className="text-sm text-red-600 overflow-auto">{error.message}</pre>
      <button
        onClick={resetErrorBoundary}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}

// Component for Services Section with Mock Data Fallback
function ServicesSection({ barbershopId, useMockData }) {
  const [newServiceName, setNewServiceName] = useState('')
  const [newServicePrice, setNewServicePrice] = useState('')
  const [localServices, setLocalServices] = useState(useMockData ? MOCK_SERVICES : [])
  
  const { data: services, isLoading, error } = useServices(barbershopId, {
    enabled: !useMockData,
    onError: (err) => console.error('Services query error:', err)
  })
  
  const createService = useCreateService()
  const updateService = useUpdateService()
  
  const displayServices = useMockData ? localServices : (services || [])
  
  const handleCreateService = () => {
    if (!newServiceName || !newServicePrice) return
    
    if (useMockData) {
      // Mock creation for development
      const newService = {
        id: Date.now().toString(),
        name: newServiceName,
        price: parseFloat(newServicePrice),
        duration_minutes: 30,
        active: true,
        category: 'test'
      }
      setLocalServices([...localServices, newService])
    } else {
      createService.mutate({
        barbershop_id: barbershopId,
        name: newServiceName,
        price: parseFloat(newServicePrice),
        duration_minutes: 30,
        active: true,
        category: 'test',
        description: 'Test service created via React Query'
      })
    }
    
    setNewServiceName('')
    setNewServicePrice('')
  }
  
  const handleToggleService = (service) => {
    if (useMockData) {
      setLocalServices(localServices.map(s => 
        s.id === service.id ? { ...s, active: !s.active } : s
      ))
    } else {
      updateService.mutate({
        serviceId: service.id,
        barbershop_id: barbershopId,
        updates: { active: !service.active }
      })
    }
  }
  
  if (!useMockData && isLoading) return <p>Loading services...</p>
  if (!useMockData && error) return <p className="text-red-600">Error: {error.message}</p>
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">
        Services {useMockData && <span className="text-sm text-blue-600">(Mock Data)</span>}
      </h2>
      
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
          disabled={!useMockData && createService.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {!useMockData && createService.isPending ? 'Creating...' : 'Add Service'}
        </button>
      </div>
      
      <div className="space-y-2">
        {displayServices.map(service => (
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
    </div>
  )
}

// Component for Appointments Section with Mock Data
function AppointmentsSection({ barbershopId, useMockData }) {
  const [localAppointments, setLocalAppointments] = useState(useMockData ? MOCK_APPOINTMENTS : [])
  
  const { data: appointments, isLoading } = useRealtimeAppointments(barbershopId, {
    enabled: !useMockData
  })
  
  const createAppointment = useCreateAppointment()
  
  const displayAppointments = useMockData ? localAppointments : (appointments || [])
  
  const handleCreateTestAppointment = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(14, 0, 0, 0)
    
    const newAppointment = {
      id: Date.now().toString(),
      barbershop_id: barbershopId,
      customer_name: 'Test Customer',
      customer_phone: '555-0123',
      customer_email: 'test@example.com',
      service_name: 'Test Service',
      start_time: tomorrow.toISOString(),
      end_time: new Date(tomorrow.getTime() + 30 * 60000).toISOString(),
      duration_minutes: 30,
      price: 50,
      status: 'confirmed'
    }
    
    if (useMockData) {
      setLocalAppointments([...localAppointments, newAppointment])
    } else {
      createAppointment.mutate(newAppointment)
    }
  }
  
  if (!useMockData && isLoading) return <p>Loading appointments...</p>
  
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">
        Real-time Appointments {useMockData && <span className="text-sm text-blue-600">(Mock Data)</span>}
      </h2>
      
      <div className="mb-4">
        <button
          onClick={handleCreateTestAppointment}
          disabled={!useMockData && createAppointment.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {!useMockData && createAppointment.isPending ? 'Creating...' : 'Create Test Appointment'}
        </button>
      </div>
      
      <div className="space-y-2">
        {displayAppointments.length === 0 ? (
          <p className="text-gray-500">No appointments found</p>
        ) : (
          displayAppointments.map(apt => (
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
      <p className="text-sm text-gray-500 mt-2">
        💡 {useMockData ? 'Using mock data for testing' : 'Real-time updates enabled'}
      </p>
    </div>
  )
}

// Main Component
export default function EnhancedReactQueryTestPage() {
  const [useMockData, setUseMockData] = useState(false)
  const [isDevMode, setIsDevMode] = useState(false)
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // Check if we're in development mode
    const devMode = process.env.NODE_ENV === 'development' && 
                    process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === 'true'
    setIsDevMode(devMode)
    setUseMockData(devMode) // Use mock data by default in dev mode
  }, [])
  
  const handleClearCache = () => {
    queryClient.clear()
    window.location.reload()
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Enhanced React Query Test Page</h1>
        
        {/* Development Mode Notice */}
        {isDevMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">📝 Development Mode Active</h2>
            <p className="text-yellow-700 mb-3">
              You're running in development mode with auth bypass enabled.
            </p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMockData}
                  onChange={(e) => setUseMockData(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Use Mock Data</span>
              </label>
              <button
                onClick={handleClearCache}
                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Clear Cache & Reload
              </button>
            </div>
          </div>
        )}
        
        {/* Phase 3-4 Implementation Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-green-800 mb-2">✅ Enhanced Implementation Features</h2>
          <ul className="text-green-700 space-y-1">
            <li>✓ Error boundaries for graceful error handling</li>
            <li>✓ Mock data support for development testing</li>
            <li>✓ Development mode with auth bypass</li>
            <li>✓ Cache management utilities</li>
            <li>✓ Real-time updates with optimistic UI</li>
            <li>✓ Full TypeScript support (optional)</li>
          </ul>
        </div>
        
        {/* Services Section with Error Boundary */}
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
          <Suspense fallback={<div className="bg-white rounded-lg shadow p-6 mb-6">Loading...</div>}>
            <ServicesSection barbershopId={TEST_BARBERSHOP_ID} useMockData={useMockData} />
          </Suspense>
        </ErrorBoundary>
        
        {/* Appointments Section with Error Boundary */}
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={() => window.location.reload()}>
          <Suspense fallback={<div className="bg-white rounded-lg shadow p-6 mb-6">Loading...</div>}>
            <AppointmentsSection barbershopId={TEST_BARBERSHOP_ID} useMockData={useMockData} />
          </Suspense>
        </ErrorBoundary>
        
        {/* Dashboard Metrics Section */}
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Dashboard Metrics {useMockData && <span className="text-sm text-blue-600">(Mock Data)</span>}
            </h2>
            
            {useMockData ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold">2</div>
                  <div className="text-sm text-gray-600">Today's Appointments</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold">4</div>
                  <div className="text-sm text-gray-600">Active Services</div>
                </div>
                <div className="p-4 bg-purple-50 rounded">
                  <div className="text-2xl font-bold">3</div>
                  <div className="text-sm text-gray-600">Active Staff</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold">$250</div>
                  <div className="text-sm text-gray-600">Today's Revenue</div>
                </div>
              </div>
            ) : (
              <DashboardMetrics barbershopId={TEST_BARBERSHOP_ID} />
            )}
          </div>
        </ErrorBoundary>
        
        {/* DevTools Info */}
        <div className="mt-8 p-4 bg-gray-100 rounded text-sm">
          <p className="font-semibold mb-2">🛠️ Developer Tools:</p>
          <ul className="space-y-1 text-gray-700">
            <li>• React Query DevTools available in bottom-right corner</li>
            <li>• Toggle between mock data and real API calls</li>
            <li>• Error boundaries prevent crashes from API failures</li>
            <li>• Cache can be cleared for fresh data</li>
            <li>• All features work in development mode without Supabase</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// Dashboard Metrics Component
function DashboardMetrics({ barbershopId }) {
  const dashboardData = useDashboardData(barbershopId)
  
  if (dashboardData.isLoading) return <p>Loading dashboard data...</p>
  if (dashboardData.isError) return <p className="text-red-600">Error loading dashboard</p>
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="p-4 bg-blue-50 rounded">
        <div className="text-2xl font-bold">{dashboardData.derivedMetrics?.todayAppointments || 0}</div>
        <div className="text-sm text-gray-600">Today's Appointments</div>
      </div>
      <div className="p-4 bg-green-50 rounded">
        <div className="text-2xl font-bold">{dashboardData.derivedMetrics?.activeServices || 0}</div>
        <div className="text-sm text-gray-600">Active Services</div>
      </div>
      <div className="p-4 bg-purple-50 rounded">
        <div className="text-2xl font-bold">{dashboardData.derivedMetrics?.activeStaff || 0}</div>
        <div className="text-sm text-gray-600">Active Staff</div>
      </div>
      <div className="p-4 bg-yellow-50 rounded">
        <div className="text-2xl font-bold">${dashboardData.metrics?.totalRevenue || 0}</div>
        <div className="text-sm text-gray-600">Total Revenue</div>
      </div>
    </div>
  )
}