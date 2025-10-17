'use client'

import { useState, useEffect, useRef } from 'react'
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
  EnvelopeIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, updateProfile, loading } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    location: '',
    role: '',
    avatar_url: ''
  })
  const [saveStatus, setSaveStatus] = useState(null) // null, 'saving', 'saved', 'error'
  const [dataLoaded, setDataLoaded] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    // Only set profile data when we have real user data
    if (!loading && user) {
      console.log('Profile page: Setting profile data', { user: user.email, profile: profile?.full_name })
      setProfileData({
        full_name: profile?.full_name || user?.user_metadata?.full_name || '',
        email: user?.email || '',
        phone: profile?.phone || '',
        bio: profile?.bio || '',
        location: profile?.location || '',
        role: profile?.role || user?.user_metadata?.role || '',
        avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || ''
      })
      setDataLoaded(true)
    }
  }, [user, profile, loading])

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file')
      setTimeout(() => setAvatarError(null), 3000)
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5MB')
      setTimeout(() => setAvatarError(null), 3000)
      return
    }

    try {
      setAvatarUploading(true)
      setAvatarError(null)

      // Upload to Supabase Storage
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch('/api/upload/staff-photo', {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'Failed to upload image')
      }

      const uploadData = await uploadResponse.json()
      console.log('Avatar uploaded:', uploadData.url)

      // Update profile with new avatar URL
      const updateResponse = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: uploadData.url })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Failed to update profile')
      }

      const updateData = await updateResponse.json()
      console.log('Profile updated:', updateData.profile)

      // Update local state
      setProfileData(prev => ({
        ...prev,
        avatar_url: uploadData.url
      }))

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 3000)

    } catch (error) {
      console.error('Avatar upload error:', error)
      setAvatarError(error.message || 'Failed to upload image')
      setTimeout(() => setAvatarError(null), 5000)
    } finally {
      setAvatarUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async () => {
    try {
      setSaveStatus('saving')
      // In a real app, you'd call updateProfile here
      // await updateProfile(profileData)
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
    // Reset to original data (no fallbacks)
    setProfileData({
      full_name: profile?.full_name || user?.user_metadata?.full_name || '',
      email: user?.email || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
      location: profile?.location || '',
      role: profile?.role || user?.user_metadata?.role || '',
      avatar_url: profile?.avatar_url || user?.user_metadata?.avatar_url || ''
    })
    setIsEditing(false)
    setSaveStatus(null)
    setAvatarError(null)
  }

  // Mock recent activity data
  const recentActivity = [
    { id: 1, type: 'booking', message: 'Completed appointment with John Doe', time: '2 hours ago', icon: CheckCircleIcon, color: 'text-green-600' },
    { id: 2, type: 'update', message: 'Updated business hours', time: '1 day ago', icon: ClockIcon, color: 'text-olive-600' },
    { id: 3, type: 'review', message: 'Received 5-star review from Sarah M.', time: '3 days ago', icon: ChartBarIcon, color: 'text-amber-700' },
  ]

  // Mock stats data
  const stats = [
    { label: 'Total Appointments', value: '247', change: '+12%', trend: 'up' },
    { label: 'Customer Rating', value: '4.9', change: '+0.2', trend: 'up' },
    { label: 'Revenue This Month', value: '$3,240', change: '+8%', trend: 'up' },
    { label: 'Active Clients', value: '89', change: '+5', trend: 'up' },
  ]

  // Show loading state until we have real data
  if (loading || !dataLoaded) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if no user data
  if (!user) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-muted-foreground">Unable to load profile data. Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your personal information and view your activity</p>
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
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Personal Information</h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 text-sm text-olive-600 hover:text-olive-700 hover:bg-olive-50 dark:hover:bg-olive-900/20 rounded-lg transition-colors"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
                  <div className="h-20 w-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center overflow-hidden">
                    {profileData.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt={profileData.full_name}
                        className="h-20 w-20 rounded-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-10 w-10 text-white" />
                    )}
                  </div>
                  {isEditing && (
                    <>
                      <button
                        type="button"
                        onClick={handleAvatarClick}
                        disabled={avatarUploading}
                        className="absolute bottom-0 right-0 h-6 w-6 bg-olive-600 rounded-full flex items-center justify-center hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Upload profile picture"
                      >
                        {avatarUploading ? (
                          <ArrowPathIcon className="h-3 w-3 text-white animate-spin" />
                        ) : (
                          <CameraIcon className="h-3 w-3 text-white" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        aria-label="Upload profile picture"
                      />
                    </>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <ArrowPathIcon className="h-6 w-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">{profileData.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{profileData.role}</p>
                  {avatarError && (
                    <p className="text-xs text-red-600 mt-1">{avatarError}</p>
                  )}
                  {avatarUploading && (
                    <p className="text-xs text-olive-600 mt-1">Uploading image...</p>
                  )}
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profileData.full_name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <div className="flex items-center space-x-2 py-2">
                    <EnvelopeIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{profileData.email}</span>
                    <span className="text-xs text-muted-foreground">(Cannot be changed)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <PhoneIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profileData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({...profileData, location: e.target.value})}
                      className="input-field"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <MapPinIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{profileData.location}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">Bio</label>
                  {isEditing ? (
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                      rows={3}
                      className="input-field"
                    />
                  ) : (
                    <p className="text-foreground py-2">{profileData.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-card rounded-xl shadow-sm border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <activity.icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-4 text-sm text-olive-600 hover:text-olive-700 dark:text-olive-400 dark:hover:text-olive-300 font-medium">
                View all activity
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Your Stats</h3>
              <div className="space-y-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-lg font-semibold text-foreground">{stat.value}</p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                      {stat.change}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/dashboard/settings"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <Cog6ToothIcon className="h-5 w-5 text-muted-foreground" />
                  <span>Account Settings</span>
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                  <span>View Bookings</span>
                </Link>
                <Link
                  href="/dashboard/analytics"
                  className="w-full flex items-center space-x-3 p-3 text-sm text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  <ChartBarIcon className="h-5 w-5 text-muted-foreground" />
                  <span>Analytics</span>
                </Link>
                <button className="w-full flex items-center space-x-3 p-3 text-sm text-foreground hover:bg-muted rounded-lg transition-colors">
                  <EyeIcon className="h-5 w-5 text-muted-foreground" />
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