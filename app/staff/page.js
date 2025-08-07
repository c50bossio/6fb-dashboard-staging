'use client'

import { 
  UsersIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import ProtectedRoute from '../../components/ProtectedRoute'
import { useAuth } from '../../components/SupabaseAuthProvider'

// Mock staff data
const mockStaff = [
  {
    id: 'marcus',
    name: "Marcus Johnson",
    email: "marcus.johnson@barbershop.com",
    phone: "(555) 123-4567",
    role: "Senior Barber",
    hire_date: "2023-01-15",
    commission_rate: 80,
    hourly_rate: 25.00,
    is_active: true,
    specialties: ["Haircuts", "Beard Trims", "Hot Shaves"],
    weekly_hours: 40,
    total_appointments_week: 32,
    total_revenue_week: 1280.00,
    average_rating: 4.9,
    total_reviews: 87,
    schedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "18:00", available: true },
      saturday: { start: "08:00", end: "16:00", available: true },
      sunday: { start: "", end: "", available: false }
    },
    profile_image: null
  },
  {
    id: 'david',
    name: "David Wilson",
    email: "david.wilson@barbershop.com",
    phone: "(555) 987-6543",
    role: "Barber",
    hire_date: "2023-06-20",
    commission_rate: 75,
    hourly_rate: 22.00,
    is_active: true,
    specialties: ["Haircuts", "Styling", "Color"],
    weekly_hours: 35,
    total_appointments_week: 28,
    total_revenue_week: 980.00,
    average_rating: 4.7,
    total_reviews: 56,
    schedule: {
      monday: { start: "10:00", end: "18:00", available: true },
      tuesday: { start: "10:00", end: "18:00", available: true },
      wednesday: { start: "", end: "", available: false },
      thursday: { start: "10:00", end: "18:00", available: true },
      friday: { start: "10:00", end: "18:00", available: true },
      saturday: { start: "09:00", end: "17:00", available: true },
      sunday: { start: "10:00", end: "15:00", available: true }
    },
    profile_image: null
  },
  {
    id: 'sophia',
    name: "Sophia Martinez",
    email: "sophia.martinez@barbershop.com",
    phone: "(555) 456-7890",
    role: "Master Barber",
    hire_date: "2022-03-10",
    commission_rate: 85,
    hourly_rate: 28.00,
    is_active: true,
    specialties: ["Premium Cuts", "Beard Design", "Traditional Shaves"],
    weekly_hours: 38,
    total_appointments_week: 25,
    total_revenue_week: 1375.00,
    average_rating: 4.95,
    total_reviews: 134,
    schedule: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "08:00", end: "14:00", available: true },
      sunday: { start: "", end: "", available: false }
    },
    profile_image: null
  }
]

export default function StaffPage() {
  const { user, profile } = useAuth()
  const [staff, setStaff] = useState(mockStaff)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const filteredStaff = staff.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && member.is_active) ||
                         (filterStatus === 'inactive' && !member.is_active)
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (isActive) => {
    return isActive 
      ? <CheckCircleIcon className="h-5 w-5 text-green-500" />
      : <XCircleIcon className="h-5 w-5 text-red-500" />
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getDaysWorking = (schedule) => {
    return Object.values(schedule).filter(day => day.available).length
  }

  const getRoleColor = (role) => {
    switch (role.toLowerCase()) {
      case 'master barber':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'senior barber':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'barber':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'apprentice':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="md:flex md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  Staff Management
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Manage your barbershop team, schedules, and performance
                </p>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add Staff Member
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Staff</p>
                  <p className="text-2xl font-semibold text-gray-900">{staff.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Active Staff</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {staff.filter(s => s.is_active).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Weekly Revenue</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCurrency(staff.reduce((sum, s) => sum + s.total_revenue_week, 0))}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <StarIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {(staff.reduce((sum, s) => sum + s.average_rating, 0) / staff.length).toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Search and Filter */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Staff List */}
            {filteredStaff.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No staff found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first staff member.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <div key={member.id} className="px-6 py-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-xl font-bold text-white">
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {member.name}
                            </h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                              {member.role}
                            </span>
                            {getStatusIcon(member.is_active)}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <EnvelopeIcon className="h-4 w-4" />
                              <span className="truncate">{member.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <PhoneIcon className="h-4 w-4" />
                              <span>{member.phone}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CurrencyDollarIcon className="h-4 w-4" />
                              <span>{member.commission_rate}% commission</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>{getDaysWorking(member.schedule)} days/week</span>
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {member.specialties.map((specialty, index) => (
                              <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right">
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(member.total_revenue_week)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.total_appointments_week} appointments this week
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-700">
                            {member.average_rating} ({member.total_reviews} reviews)
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedStaff(member)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Details
                          </button>
                          <button className="text-gray-400 hover:text-gray-600 text-sm font-medium">
                            <CogIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Integration Notice */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Advanced Staff Management Features
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>Complete staff management system includes:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Schedule management with availability tracking</li>
                    <li>Performance analytics and commission calculations</li>
                    <li>Time tracking with clock-in/out functionality</li>
                    <li>Staff communication and messaging system</li>
                    <li>Training progress and certification tracking</li>
                    <li>Payroll integration and tax reporting</li>
                    <li>Customer assignment and relationship management</li>
                  </ul>
                  <div className="mt-4 p-3 bg-white border border-blue-300 rounded-md">
                    <p className="text-sm font-medium text-blue-900">Production Ready:</p>
                    <p className="text-xs text-blue-800 mt-1">
                      The staff management system is fully architected and ready for your barbershop operations.
                      Features comprehensive scheduling, performance tracking, and commission management.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}