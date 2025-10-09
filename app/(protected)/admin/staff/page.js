'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PlusIcon, UserCircleIcon, EnvelopeIcon, PhoneIcon, LinkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

/**
 * Staff Management Page
 * Lists all team members with option to add new barbers
 */
export default function StaffManagementPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [successName, setSuccessName] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadStaff()

    // Check for success message
    if (searchParams.get('success') === 'true') {
      setSuccessName(searchParams.get('name') || 'New staff member')
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000)
    }
  }, [searchParams])

  const loadStaff = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all staff members (barbers, managers, etc.)
      const { data: staffData, error: staffError } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['BARBER', 'MANAGER'])
        .order('created_at', { ascending: false })

      if (staffError) throw staffError

      setStaff(staffData || [])
    } catch (err) {
      console.error('Error loading staff:', err)
      setError('Failed to load staff members')
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = () => {
    router.push('/admin/staff/onboard')
  }

  const handleViewBookingUrl = (slug) => {
    const url = `${window.location.origin}/book/${slug}`
    window.open(url, '_blank')
  }

  const handleCopyBookingUrl = async (slug) => {
    const url = `${window.location.origin}/book/${slug}`
    await navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-1">Manage your barbers and staff members</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.push('/admin/staff/analytics')}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-background focus:ring-4 focus:ring-gray-200"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              View Analytics
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 focus:ring-4 focus:ring-olive-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Barber
            </button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <p className="text-green-800 font-medium">
              Successfully onboarded {successName}!
            </p>
            <p className="text-green-700 text-sm mt-1">
              Their booking page is now live and ready to share with clients.
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Migration Notice */}
      {staff.some(member => !member.booking_slug) && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Upgrade to New Booking URLs
            </h3>
            <p className="text-sm text-blue-800">
              Some of your barbers are still using old URL formats. Migrate them to SEO-friendly booking URLs like{' '}
              <code className="px-1 py-0.5 bg-blue-100 rounded">/book/john-smith</code>
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/staff/migrate')}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm whitespace-nowrap"
          >
            Run Migration
          </button>
        </div>
      )}

      {/* Staff Count */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {staff.length} team member{staff.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="text-center py-12 bg-white border-2 border-dashed border-gray-300 rounded-lg">
          <UserCircleIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
          <p className="text-gray-600 mb-6">Get started by adding your first barber</p>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add New Barber
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {staff.map((member) => (
            <div
              key={member.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Profile Photo & Name */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="flex-shrink-0">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={`${member.first_name} ${member.last_name}`}
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-300"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-300">
                      <UserCircleIcon className="h-10 w-10 text-gray-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {member.first_name} {member.last_name}
                  </h3>
                  <p className="text-sm text-gray-600 capitalize">{member.role.toLowerCase()}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4 text-sm">
                {member.email && (
                  <div className="flex items-center text-gray-600">
                    <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{member.email}</span>
                  </div>
                )}
                {member.phone && (
                  <div className="flex items-center text-gray-600">
                    <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{member.phone}</span>
                  </div>
                )}
              </div>

              {/* Specialties */}
              {member.specialties && member.specialties.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {member.specialties.slice(0, 3).map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-olive-100 text-olive-800"
                      >
                        {specialty}
                      </span>
                    ))}
                    {member.specialties.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                        +{member.specialties.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Financial Model */}
              <div className="mb-4 p-3 bg-background rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Payment Model</p>
                {member.financial_model === 'commission' && (
                  <p className="text-sm font-semibold text-gray-900">
                    Commission: {member.commission_percentage}%
                  </p>
                )}
                {member.financial_model === 'booth_rent' && (
                  <p className="text-sm font-semibold text-gray-900">
                    Booth Rent: ${member.booth_rent_amount} {member.booth_rent_frequency}
                  </p>
                )}
              </div>

              {/* Booking URL */}
              {member.booking_slug && (
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-600 mb-2">Booking Link</p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewBookingUrl(member.booking_slug)}
                      className="flex-1 px-3 py-2 bg-olive-50 text-olive-700 rounded-lg hover:bg-olive-100 text-sm font-medium flex items-center justify-center"
                      title="View booking page"
                    >
                      <LinkIcon className="h-4 w-4 mr-1.5" />
                      View Page
                    </button>
                    <button
                      onClick={() => handleCopyBookingUrl(member.booking_slug)}
                      className="px-3 py-2 bg-background text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
                      title="Copy URL"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 font-mono truncate">
                    /book/{member.booking_slug}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
