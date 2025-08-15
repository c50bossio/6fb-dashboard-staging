'use client'

import { useState, useEffect } from 'react'
import { 
  UserIcon,
  PencilIcon,
  CameraIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  EyeIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    role: ''
  })
  const [saveStatus, setSaveStatus] = useState(null) // null, 'saving', 'saved', 'error'

  useEffect(() => {
    setProfileData({
      full_name: profile?.full_name || user?.user_metadata?.full_name || 'Dev User',
      email: user?.email || 'dev@localhost.com',
      phone: profile?.phone || '+1 (555) 123-4567',
      bio: profile?.bio || 'Passionate about delivering exceptional barbershop experiences.',
      location: profile?.location || 'San Francisco, CA',
      role: profile?.role || user?.user_metadata?.role || 'Shop Owner'
    })
  }, [user, profile])

  const handleSave = async () => {
    try {
      setSaveStatus('saving')
      setTimeout(() => {
        setSaveStatus('saved')
        setIsEditing(false)
        setTimeout(() => setSaveStatus(null), 3000)
      }, 1000)
    } catch (error) {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleCancel = () => {
    setProfileData({
      full_name: profile?.full_name || user?.user_metadata?.full_name || 'Dev User',
      email: user?.email || 'dev@localhost.com',
      phone: profile?.phone || '+1 (555) 123-4567',
      bio: profile?.bio || 'Passionate about delivering exceptional barbershop experiences.',
      location: profile?.location || 'San Francisco, CA',
      role: profile?.role || user?.user_metadata?.role || 'Shop Owner'
    })
    setIsEditing(false)
    setSaveStatus(null)
  }

  const recentActivity = [
    { id: 1, type: 'booking', message: 'Completed appointment with John Doe', time: '2 hours ago', icon: CheckCircleIcon, color: 'text-green-600' },
    { id: 2, type: 'update', message: 'Updated business hours', time: '1 day ago', icon: ClockIcon, color: 'text-olive-600' },
    { id: 3, type: 'review', message: 'Received 5-star review from Sarah M.', time: '3 days ago', icon: ChartBarIcon, color: 'text-amber-700' },
  ]

  const stats = [
    { label: 'Total Appointments', value: '247', change: '+12%', trend: 'up' },
    { label: 'Customer Rating', value: '4.9', change: '+0.2', trend: 'up' },
    { label: 'Revenue This Month', value: '$3,240', change: '+8%', trend: 'up' },
    { label: 'Active Clients', value: '89', change: '+5', trend: 'up' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your personal information and view your activity</p>
        </div>

        {/* Save Status */}
        {saveStatus && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            saveStatus === 'saved' ? 'bg-green-50 text-green-800 border border-green-200' :
            saveStatus === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-olive-50 text-olive-800 border border-olive-200'
          }`}>
            {saveStatus === 'saved' && <CheckCircleIcon className="h-5 w-5" />}
            {saveStatus === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
            <span className="text-sm font-medium">
              {saveStatus === 'saving' && 'Saving changes...'}
              {saveStatus === 'saved' && 'Profile updated successfully!'}
              {saveStatus === 'error' && 'Failed to update profile. Please try again.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm text-olive-600 hover:text-olive-700 hover:bg-olive-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saveStatus === 'saving'}
                      className="px-3 py-1.5 text-sm text-white bg-olive-600 hover:bg-olive-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {/* Profile Picture */}
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                    {user?.user_metadata?.avatar_url ? (
                      <img 
                        src={user.user_metadata.avatar_url} 
                        alt={profileData.full_name}
                        className="h-20 w-20 rounded-full"
                      />
                    ) : (
                      <UserIcon className="h-10 w-10 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 h-6 w-6 bg-olive-600 rounded-full flex items-center justify-center hover:bg-olive-700 transition-colors">
                      <CameraIcon className="h-3 w-3 text-white" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{profileData.full_name}</h3>
                  <p className="text-sm text-gray-500">{profileData.role}</p>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profileData.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <div className="flex items-center space-x-2 py-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-500">{profileData.email}</span>
                    <span className="text-xs text-gray-400">(Cannot be changed)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profileData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-900">{profileData.location}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{profileData.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-sm text-olive-600 hover:text-olive-700 font-medium">
                View all activity
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Stats</h3>
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">{stat.label}</p>
                      <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link 
                  href="/dashboard/settings"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Cog6ToothIcon className="h-5 w-5 text-gray-400" />
                  <span>Account Settings</span>
                </Link>
                <Link 
                  href="/dashboard/bookings"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <span>View Bookings</span>
                </Link>
                <Link 
                  href="/dashboard/analytics"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5 text-gray-400" />
                  <span>Analytics</span>
                </Link>
                <button className="w-full flex items-center space-x-3 p-3 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                  <EyeIcon className="h-5 w-5 text-gray-400" />
                  <span>Public Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}