'use client'

import { 
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  PaintBrushIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  KeyIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronRightIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useAuth } from '../../../components/SupabaseAuthProvider'
import { Card } from '../../../components/ui'

function SettingsSection({ title, description, icon: Icon, children }) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="flex items-start space-x-4 mb-6">
        <div className="flex-shrink-0">
          <div className="h-10 w-10 bg-gradient-to-br from-olive-50 to-gold-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-olive-600" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </Card>
  )
}

function SettingsItem({ label, description, value, onChange, type = "text", options = [] }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <label className="text-sm font-medium text-gray-900">{label}</label>
        {description && (
          <p className="mt-1 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">
        {type === "toggle" ? (
          <button
            onClick={() => onChange(!value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-olive-600' : 'bg-gray-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              value ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        ) : type === "select" ? (
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border-gray-300 rounded-lg focus:ring-olive-500 focus:border-olive-500"
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === "button" ? (
          <button
            onClick={onChange}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium flex items-center"
          >
            {value}
            <ChevronRightIcon className="h-4 w-4 ml-1" />
          </button>
        ) : (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-sm border-gray-300 rounded-lg focus:ring-olive-500 focus:border-olive-500"
          />
        )}
      </div>
    </div>
  )
}

function Settings() {
  const { user } = useAuth()
  const [showSaveNotification, setShowSaveNotification] = useState(false)
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.full_name || 'Unknown User',
    email: user?.email || 'john@example.com',
    phone: '+1 (555) 123-4567',
    role: 'Shop Owner',
    shopName: 'Elite Barbershop'
  })
  
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    bookingReminders: true,
    marketingEmails: false,
    dailyReports: true,
    weeklyAnalytics: true
  })
  
  const [appearance, setAppearance] = useState({
    theme: 'light',
    compactMode: false,
    showAnimations: true,
    defaultView: 'dashboard'
  })
  
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'team',
    shareAnalytics: true,
    dataCollection: true,
    twoFactorAuth: false
  })
  
  const handleSave = () => {
    setShowSaveNotification(true)
    setTimeout(() => setShowSaveNotification(false), 3000)
  }
  
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>
      
      {/* Save Notification */}
      {showSaveNotification && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg z-50 flex items-center space-x-2">
          <CheckIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-green-800">Settings saved successfully!</span>
        </div>
      )}
      
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <SettingsSection
          title="Profile"
          description="Manage your personal information"
          icon={UserIcon}
        >
          <SettingsItem
            label="Full Name"
            value={profile.name}
            onChange={(value) => setProfile({...profile, name: value})}
          />
          <SettingsItem
            label="Email Address"
            value={profile.email}
            type="email"
            onChange={(value) => setProfile({...profile, email: value})}
          />
          <SettingsItem
            label="Phone Number"
            value={profile.phone}
            type="tel"
            onChange={(value) => setProfile({...profile, phone: value})}
          />
          <SettingsItem
            label="Shop Name"
            value={profile.shopName}
            onChange={(value) => setProfile({...profile, shopName: value})}
          />
          <SettingsItem
            label="Change Password"
            value="Update"
            type="button"
            onChange={() => console.log('Change password')}
          />
        </SettingsSection>
        
        {/* Notification Preferences */}
        <SettingsSection
          title="Notifications"
          description="Choose how you want to be notified"
          icon={BellIcon}
        >
          <SettingsItem
            label="Email Notifications"
            description="Receive booking confirmations via email"
            value={notifications.emailNotifications}
            type="toggle"
            onChange={(value) => setNotifications({...notifications, emailNotifications: value})}
          />
          <SettingsItem
            label="SMS Notifications"
            description="Get text messages for urgent updates"
            value={notifications.smsNotifications}
            type="toggle"
            onChange={(value) => setNotifications({...notifications, smsNotifications: value})}
          />
          <SettingsItem
            label="Push Notifications"
            description="Browser notifications for real-time updates"
            value={notifications.pushNotifications}
            type="toggle"
            onChange={(value) => setNotifications({...notifications, pushNotifications: value})}
          />
          <SettingsItem
            label="Booking Reminders"
            description="Remind customers 24 hours before appointment"
            value={notifications.bookingReminders}
            type="toggle"
            onChange={(value) => setNotifications({...notifications, bookingReminders: value})}
          />
          <SettingsItem
            label="Daily Reports"
            description="Receive daily business summary"
            value={notifications.dailyReports}
            type="toggle"
            onChange={(value) => setNotifications({...notifications, dailyReports: value})}
          />
        </SettingsSection>
        
        {/* Appearance Settings */}
        <SettingsSection
          title="Appearance"
          description="Customize how the dashboard looks"
          icon={PaintBrushIcon}
        >
          <SettingsItem
            label="Theme"
            description="Choose your preferred color scheme"
            value={appearance.theme}
            type="select"
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'System' }
            ]}
            onChange={(value) => setAppearance({...appearance, theme: value})}
          />
          <SettingsItem
            label="Compact Mode"
            description="Reduce spacing for more content"
            value={appearance.compactMode}
            type="toggle"
            onChange={(value) => setAppearance({...appearance, compactMode: value})}
          />
          <SettingsItem
            label="Animations"
            description="Enable smooth transitions and effects"
            value={appearance.showAnimations}
            type="toggle"
            onChange={(value) => setAppearance({...appearance, showAnimations: value})}
          />
          <SettingsItem
            label="Default View"
            description="Page to show after login"
            value={appearance.defaultView}
            type="select"
            options={[
              { value: 'dashboard', label: 'Dashboard' },
              { value: 'bookings', label: 'Bookings' },
              { value: 'analytics', label: 'Analytics' }
            ]}
            onChange={(value) => setAppearance({...appearance, defaultView: value})}
          />
        </SettingsSection>
        
        {/* Privacy & Security */}
        <SettingsSection
          title="Privacy & Security"
          description="Control your data and security settings"
          icon={ShieldCheckIcon}
        >
          <SettingsItem
            label="Profile Visibility"
            description="Who can see your profile information"
            value={privacy.profileVisibility}
            type="select"
            options={[
              { value: 'public', label: 'Public' },
              { value: 'team', label: 'Team Only' },
              { value: 'private', label: 'Private' }
            ]}
            onChange={(value) => setPrivacy({...privacy, profileVisibility: value})}
          />
          <SettingsItem
            label="Share Analytics"
            description="Share performance data with team"
            value={privacy.shareAnalytics}
            type="toggle"
            onChange={(value) => setPrivacy({...privacy, shareAnalytics: value})}
          />
          <SettingsItem
            label="Data Collection"
            description="Allow analytics for improved experience"
            value={privacy.dataCollection}
            type="toggle"
            onChange={(value) => setPrivacy({...privacy, dataCollection: value})}
          />
          <SettingsItem
            label="Two-Factor Authentication"
            description="Add extra security to your account"
            value={privacy.twoFactorAuth}
            type="toggle"
            onChange={(value) => setPrivacy({...privacy, twoFactorAuth: value})}
          />
          <SettingsItem
            label="Export Data"
            value="Download"
            type="button"
            onChange={() => console.log('Export data')}
          />
        </SettingsSection>
        
        {/* Billing & Subscription */}
        <SettingsSection
          title="Billing & Subscription"
          description="Manage your subscription and payments"
          icon={CreditCardIcon}
        >
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-olive-900">Current Plan</span>
              <span className="text-sm font-bold text-olive-600">Professional</span>
            </div>
            <p className="text-xs text-olive-700 mb-3">$99/month • Renews on Jan 1, 2025</p>
            <button className="w-full bg-olive-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-olive-700 transition-colors">
              Upgrade Plan
            </button>
          </div>
          <SettingsItem
            label="Payment Method"
            value="•••• 4242"
            type="button"
            onChange={() => console.log('Update payment')}
          />
          <SettingsItem
            label="Billing History"
            value="View"
            type="button"
            onChange={() => console.log('View billing')}
          />
          <SettingsItem
            label="Cancel Subscription"
            value="Cancel"
            type="button"
            onChange={() => console.log('Cancel subscription')}
          />
        </SettingsSection>
        
        {/* Integrations */}
        <SettingsSection
          title="Integrations"
          description="Connect with third-party services"
          icon={GlobeAltIcon}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Google Calendar</p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to disconnect Google Calendar?')) {
                    // Handle Google Calendar disconnect
                    alert('Google Calendar disconnected successfully')
                  }
                }}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Disconnect
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center">
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Stripe</p>
                  <p className="text-xs text-gray-500">Not connected</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert('Redirecting to Stripe Connect... This would open Stripe authentication flow.')
                  // TODO: Implement actual Stripe Connect flow
                }}
                className="text-xs text-olive-600 hover:text-olive-700"
              >
                Connect
              </button>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-lg flex items-center justify-center">
                  <XMarkIcon className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">QuickBooks</p>
                  <p className="text-xs text-gray-500">Not connected</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert('Redirecting to QuickBooks Connect... This would open QuickBooks authentication flow.')
                  // TODO: Implement actual QuickBooks Connect flow
                }}
                className="text-xs text-olive-600 hover:text-olive-700"
              >
                Connect
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>
      
      {/* Additional Settings */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* API & Developer */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <CodeBracketIcon className="h-6 w-6 text-gold-600" />
            <h3 className="text-lg font-semibold text-gray-900">API & Developer</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              API Keys
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Webhooks
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Developer Docs
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
        
        {/* Help & Support */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <QuestionMarkCircleIcon className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Help & Support</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Help Center
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Contact Support
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Feature Requests
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
        
        {/* Legal & Compliance */}
        <Card className="hover:shadow-lg transition-shadow duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <DocumentTextIcon className="h-6 w-6 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Legal & Compliance</h3>
          </div>
          <div className="space-y-3">
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Terms of Service
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              Privacy Policy
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button className="w-full text-left text-sm text-gray-600 hover:text-gray-900 py-2 flex items-center justify-between">
              GDPR Settings
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
        </Card>
      </div>
      
      {/* Save Button */}
      <div className="mt-8 flex items-center justify-between bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Save Changes</h3>
          <p className="text-sm text-gray-500 mt-1">Your changes will be applied immediately</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-olive-600 rounded-lg hover:bg-olive-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
      
      {/* Sign Out */}
      <div className="mt-6 flex justify-center">
        <button className="flex items-center space-x-2 text-sm text-red-600 hover:text-red-700 font-medium">
          <ArrowRightOnRectangleIcon className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <Settings />
    </ProtectedRoute>
  )
}