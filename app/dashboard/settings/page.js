'use client'

import { useState, useEffect } from 'react'
import { 
  CogIcon,
  BellIcon,
  KeyIcon,
  UserCircleIcon,
  OfficeBuildingIcon,
  PhoneIcon,
  MailIcon,
  EyeIcon,
  EyeOffIcon
} from '@heroicons/react/outline'

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
    api: {
      twilioSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      sendgridKey: 'SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      openaiKey: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      anthropicKey: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    }
  })
  
  const [showApiKeys, setShowApiKeys] = useState({
    twilio: false,
    sendgrid: false,
    openai: false,
    anthropic: false
  })

  const handleSave = async () => {
    try {
      // Here you would save settings via API
      alert('Settings saved successfully!')
    } catch (error) {
      alert('Error saving settings: ' + error.message)
    }
  }

  const toggleApiKeyVisibility = (service) => {
    setShowApiKeys(prev => ({
      ...prev,
      [service]: !prev[service]
    }))
  }

  const maskApiKey = (key) => {
    if (!key) return ''
    return key.substring(0, 8) + '...' + key.substring(key.length - 4)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-gray-600">Configure your barbershop and system preferences</p>
            </div>
            <button onClick={handleSave} className="btn-primary">
              Save Changes
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Barbershop Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <div className="flex items-center mb-6">
                <OfficeBuildingIcon className="h-6 w-6 text-blue-600 mr-3" />
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
                    className="input-field"
                  />
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

            {/* API Configuration */}
            <div className="card">
              <div className="flex items-center mb-6">
                <KeyIcon className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">API Configuration</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Twilio Account SID
                  </label>
                  <div className="flex items-center">
                    <input
                      type={showApiKeys.twilio ? "text" : "password"}
                      value={showApiKeys.twilio ? settings.api.twilioSid : maskApiKey(settings.api.twilioSid)}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        api: { ...prev.api, twilioSid: e.target.value }
                      }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('twilio')}
                      className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKeys.twilio ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SendGrid API Key
                  </label>
                  <div className="flex items-center">
                    <input
                      type={showApiKeys.sendgrid ? "text" : "password"}
                      value={showApiKeys.sendgrid ? settings.api.sendgridKey : maskApiKey(settings.api.sendgridKey)}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        api: { ...prev.api, sendgridKey: e.target.value }
                      }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('sendgrid')}
                      className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKeys.sendgrid ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    OpenAI API Key
                  </label>
                  <div className="flex items-center">
                    <input
                      type={showApiKeys.openai ? "text" : "password"}
                      value={showApiKeys.openai ? settings.api.openaiKey : maskApiKey(settings.api.openaiKey)}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        api: { ...prev.api, openaiKey: e.target.value }
                      }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('openai')}
                      className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKeys.openai ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Anthropic API Key
                  </label>
                  <div className="flex items-center">
                    <input
                      type={showApiKeys.anthropic ? "text" : "password"}
                      value={showApiKeys.anthropic ? settings.api.anthropicKey : maskApiKey(settings.api.anthropicKey)}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        api: { ...prev.api, anthropicKey: e.target.value }
                      }))}
                      className="input-field flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => toggleApiKeyVisibility('anthropic')}
                      className="ml-2 p-2 text-gray-500 hover:text-gray-700"
                    >
                      {showApiKeys.anthropic ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
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
                    <MailIcon className="h-4 w-4 text-gray-500 mr-2" />
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