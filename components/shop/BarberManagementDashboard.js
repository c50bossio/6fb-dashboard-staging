'use client'

import { 
  UserIcon,
  UserPlusIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function BarberManagementDashboard() {
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview') // overview, performance, onboarding
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchBarbers()
  }, [view])

  const fetchBarbers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/shop/barbers/enhanced?view=${view}`)
      const data = await response.json()
      
      if (response.ok) {
        setBarbers(data.barbers || [])
      } else {
        console.error('Failed to fetch barbers:', data.error)
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'onboarding': return 'bg-yellow-100 text-yellow-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getOnboardingProgress = (barber) => {
    if (!barber.onboarding) return 0
    const completed = [
      barber.onboarding.profile_completed,
      barber.onboarding.license_uploaded,
      barber.onboarding.contract_signed,
      barber.onboarding.chair_assigned,
      barber.onboarding.payment_setup
    ].filter(Boolean).length
    return (completed / 5) * 100
  }

  const BarberCard = ({ barber }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-r from-olive-400 to-olive-600 flex items-center justify-center text-white font-medium">
            {barber.user?.full_name?.charAt(0) || 'B'}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {barber.user?.full_name || 'Unnamed Barber'}
            </h3>
            <p className="text-sm text-gray-600">{barber.user?.email}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(barber.is_active ? 'active' : 'inactive')}`}>
            {barber.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            ${barber.metrics?.monthly_revenue || 0}
          </div>
          <div className="text-xs text-gray-600">Monthly Revenue</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {barber.metrics?.monthly_appointments || 0}
          </div>
          <div className="text-xs text-gray-600">Appointments</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center">
            <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
            <span className="text-xl font-bold text-gray-900">
              {barber.metrics?.average_rating || 0}
            </span>
          </div>
          <div className="text-xs text-gray-600">Avg Rating</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-gray-900">
            {barber.metrics?.upcoming_appointments || 0}
          </div>
          <div className="text-xs text-gray-600">Upcoming</div>
        </div>
      </div>

      {/* Onboarding Progress (if applicable) */}
      {view === 'onboarding' && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Onboarding Progress</span>
            <span className="text-sm text-gray-600">{Math.round(getOnboardingProgress(barber))}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-olive-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getOnboardingProgress(barber)}%` }}
            />
          </div>
        </div>
      )}

      {/* Financial Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <span className="flex items-center">
          <BanknotesIcon className="h-4 w-4 mr-1" />
          {barber.financial_model === 'commission' 
            ? `${barber.commission_rate}% Commission`
            : `$${barber.booth_rent_amount} Booth Rent`
          }
        </span>
        <span className="flex items-center">
          <ClockIcon className="h-4 w-4 mr-1" />
          {barber.metrics?.today_status || 'Off'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            onClick={() => setSelectedBarber(barber)}
            className="p-2 text-gray-400 hover:text-olive-600 transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
            <PencilIcon className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="text-xs text-gray-500">
          Chair #{barber.chair_number || 'Unassigned'}
        </div>
      </div>
    </div>
  )

  const ViewTabs = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      {[
        { key: 'overview', label: 'Overview', icon: UserIcon },
        { key: 'performance', label: 'Performance', icon: ChartBarIcon },
        { key: 'onboarding', label: 'Onboarding', icon: DocumentTextIcon }
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => setView(tab.key)}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            view === tab.key
              ? 'bg-white text-olive-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <tab.icon className="h-4 w-4 mr-2" />
          {tab.label}
        </button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Barber Management</h1>
            <p className="text-gray-600">Manage your shop's barber team</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-olive-600 text-white px-4 py-2 rounded-lg hover:bg-olive-700 transition-colors flex items-center"
          >
            <UserPlusIcon className="h-5 w-5 mr-2" />
            Add Barber
          </button>
        </div>
        
        <ViewTabs />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Barbers</p>
              <p className="text-2xl font-bold text-gray-900">{barbers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {barbers.filter(b => b.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Onboarding</p>
              <p className="text-2xl font-bold text-gray-900">
                {barbers.filter(b => !b.onboarding_completed).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-olive-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-olive-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(
                  barbers
                    .filter(b => b.financial_model === 'commission')
                    .reduce((sum, b) => sum + (b.commission_rate || 0), 0) / 
                  Math.max(barbers.filter(b => b.financial_model === 'commission').length, 1)
                )}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Barbers Grid */}
      {barbers.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No barbers</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding your first barber.</p>
          <div className="mt-6">
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-olive-600 text-white px-4 py-2 rounded-lg hover:bg-olive-700 transition-colors inline-flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Barber
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {barbers.map((barber) => (
            <BarberCard key={barber.id} barber={barber} />
          ))}
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedBarber && (
        <BarberDetailModal 
          barber={selectedBarber} 
          onClose={() => setSelectedBarber(null)}
          onUpdate={fetchBarbers}
        />
      )}
    </div>
  )
}

// Detailed Modal Component
function BarberDetailModal({ barber, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('overview')
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-r from-olive-400 to-olive-600 flex items-center justify-center text-white font-medium">
                {barber.user?.full_name?.charAt(0) || 'B'}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {barber.user?.full_name || 'Unnamed Barber'}
                </h2>
                <p className="text-gray-600">{barber.user?.email}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'performance', label: 'Performance' },
              { key: 'schedule', label: 'Schedule' },
              { key: 'financial', label: 'Financial' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-olive-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Modal Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="ml-2 text-gray-600">{barber.user?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Experience:</span>
                    <span className="ml-2 text-gray-600">{barber.customization?.years_experience || 0} years</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Specialties:</span>
                    <span className="ml-2 text-gray-600">
                      {barber.customization?.specialties?.join(', ') || 'None specified'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Chair:</span>
                    <span className="ml-2 text-gray-600">#{barber.chair_number || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'performance' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Metrics</h3>
              <p className="text-gray-600">Performance data will be displayed here...</p>
            </div>
          )}
          
          {activeTab === 'schedule' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Schedule & Availability</h3>
              <p className="text-gray-600">Schedule management will be displayed here...</p>
            </div>
          )}
          
          {activeTab === 'financial' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Financial Arrangement</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Model:</span>
                      <span className="ml-2 text-gray-600 capitalize">
                        {barber.financial_model?.replace('_', ' ') || 'Not set'}
                      </span>
                    </div>
                    {barber.financial_model === 'commission' && (
                      <div>
                        <span className="font-medium text-gray-700">Commission Rate:</span>
                        <span className="ml-2 text-gray-600">{barber.commission_rate}%</span>
                      </div>
                    )}
                    {barber.financial_model === 'booth_rent' && (
                      <div>
                        <span className="font-medium text-gray-700">Booth Rent:</span>
                        <span className="ml-2 text-gray-600">${barber.booth_rent_amount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}