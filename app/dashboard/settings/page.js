'use client'

import { useState, useEffect } from 'react'
import { 
  CogIcon,
  BellIcon,
  KeyIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    barbershop: {
      name: 'Demo Barbershop',
      address: '123 Main Street, City, State 12345',
      phone: '+1 (555) 123-4567',
      email: 'demo@barbershop.com',
      timezone: 'America/New_York'
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      campaignAlerts: true,
      bookingAlerts: true,
      systemAlerts: true
    },
    apiMode: 'managed' // Always use our managed APIs
  })
  

  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')
  
  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/v1/settings/barbershop', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSettings(prev => ({
            ...prev,
            barbershop: data.barbershop || prev.barbershop,
            notifications: data.notifications || prev.notifications
          }))
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    
    loadSettings()
  }, [])

  const handleSave = async () => {
    try {
      setLoading(true)
      setErrors({})
      setSuccessMessage('')
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(settings.barbershop.email)) {
        setErrors({ email: 'Invalid email format' })
        setLoading(false)
        return
      }
      
      // Save settings via API
      const response = await fetch('/api/v1/settings/barbershop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) {
        throw new Error('Failed to save settings')
      }
      
      setSuccessMessage('Settings saved successfully!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      setErrors({ general: error.message || 'Error saving settings' })
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Notifications */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-100 border border-green-200 text-green-800 rounded-lg">
            {successMessage}
          </div>
        )}
        
        {errors.general && (
          <div className="mb-6 p-4 bg-red-100 border border-red-200 text-red-800 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-600">Configure your barbershop and system preferences</p>
            </div>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className={`btn-primary ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Barbershop Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center mb-6">
                <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Barbershop Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={settings.barbershop.name}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      barbershop: { ...prev.barbershop, name: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.barbershop.phone}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      barbershop: { ...prev.barbershop, phone: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={settings.barbershop.address}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      barbershop: { ...prev.barbershop, address: e.target.value }
                    }))}
                    className="input-field"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.barbershop.email}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      barbershop: { ...prev.barbershop, email: e.target.value }
                    }))}
                    className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.barbershop.timezone}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      barbershop: { ...prev.barbershop, timezone: e.target.value }
                    }))}
                    className="input-field"
                  >
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>
              </div>
            </div>

            {/* API Services & Pricing */}
            <div className="card">
              <div className="flex items-center mb-6">
                <KeyIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">AI & Communication Services</h3>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-900 mb-2">✨ All-Inclusive API Services</h4>
                <p className="text-sm text-blue-800 mb-3">
                  We handle all AI and communication services for you. No complex setup or API management needed!
                </p>
                <div className="space-y-3">
                  <div className="bg-white rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">AI Business Coach</span>
                        <p className="text-xs text-gray-600">Powered by GPT-4 & Claude</p>
                      </div>
                      <span className="font-semibold text-blue-600">$0.06/1K tokens</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">SMS Marketing</span>
                        <p className="text-xs text-gray-600">Automated appointment reminders & campaigns</p>
                      </div>
                      <span className="font-semibold text-blue-600">$0.02/message</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-md p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium text-gray-900">Email Campaigns</span>
                        <p className="text-xs text-gray-600">Professional templates & automation</p>
                      </div>
                      <span className="font-semibold text-blue-600">$0.001/email</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current Month Usage</p>
                      <p className="text-xs text-gray-600">Resets on the 1st</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">$124.50</p>
                      <a href="/dashboard/billing" className="text-xs text-blue-700 hover:underline">View detailed breakdown →</a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">💡 How It Works</h5>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• All AI and communication services are included</li>
                  <li>• Pay only for what you use - no setup fees</li>
                  <li>• Usage automatically billed to your account</li>
                  <li>• Detailed analytics in your billing dashboard</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <div className="card">
              <div className="flex items-center mb-6">
                <BellIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.emailEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, emailEnabled: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <PhoneIcon className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.smsEnabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, smsEnabled: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Campaign Alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.campaignAlerts}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, campaignAlerts: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Booking Alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.bookingAlerts}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, bookingAlerts: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">System Alerts</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.notifications.systemAlerts}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, systemAlerts: e.target.checked }
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card mt-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">System Status</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Status</span>
                  <span className="badge badge-success">All Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="badge badge-success">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Agents</span>
                  <span className="badge badge-success">6 Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Backup</span>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}