'use client'

import { 
  CogIcon,
  BellIcon,
  UserCircleIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  CalendarDaysIcon,
  PencilIcon
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef, memo } from 'react'

const KeyIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.KeyIcon })))
const EyeIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.EyeIcon })))
const EyeSlashIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.EyeSlashIcon })))
const PlusIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.PlusIcon })))
const TrashIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.TrashIcon })))
const CreditCardIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.CreditCardIcon })))
const ChartBarIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ChartBarIcon })))
const ArrowDownTrayIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ArrowDownTrayIcon })))
const ArrowTrendingUpIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ArrowTrendingUpIcon })))
const ArrowTrendingDownIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.ArrowTrendingDownIcon })))
const BanknotesIcon = dynamic(() => import('@heroicons/react/24/outline').then(mod => ({ default: mod.BanknotesIcon })))
import MFASetup from '../../../../components/auth/MFASetup'
import SubscriptionDashboard from '../../../../components/billing/SubscriptionDashboard'
import InternationalPhoneInput from '../../../../components/InternationalPhoneInput'
import NuclearInput from '../../../../components/NuclearInput'
import PaymentProcessingSettings from '../../../../components/settings/PaymentProcessingSettings'
import TimeRangePicker from '../../../../components/TimeRangePicker'

const ChartLoadingSpinner = () => (
  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
      <p className="text-sm text-gray-500 mt-2">Loading chart...</p>
    </div>
  </div>
)

const LineChart = dynamic(() => import('recharts').then((mod) => ({ default: mod.LineChart })), { 
  ssr: false,
  loading: () => <ChartLoadingSpinner />
})
const Line = dynamic(() => import('recharts').then((mod) => ({ default: mod.Line })), { ssr: false })
const BarChart = dynamic(() => import('recharts').then((mod) => ({ default: mod.BarChart })), { 
  ssr: false,
  loading: () => <ChartLoadingSpinner />
})
const Bar = dynamic(() => import('recharts').then((mod) => ({ default: mod.Bar })), { ssr: false })
const PieChart = dynamic(() => import('recharts').then((mod) => ({ default: mod.PieChart })), { 
  ssr: false,
  loading: () => <ChartLoadingSpinner />
})
const Pie = dynamic(() => import('recharts').then((mod) => ({ default: mod.Pie })), { ssr: false })
const Cell = dynamic(() => import('recharts').then((mod) => ({ default: mod.Cell })), { ssr: false })
const XAxis = dynamic(() => import('recharts').then((mod) => ({ default: mod.XAxis })), { ssr: false })
const YAxis = dynamic(() => import('recharts').then((mod) => ({ default: mod.YAxis })), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then((mod) => ({ default: mod.CartesianGrid })), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then((mod) => ({ default: mod.Tooltip })), { ssr: false })
const Legend = dynamic(() => import('recharts').then((mod) => ({ default: mod.Legend })), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })), { ssr: false })

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
    businessHours: {
      monday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
      tuesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
      wednesday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
      thursday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
      friday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
      saturday: { enabled: true, shifts: [{ open: '10:00', close: '16:00' }] },
      sunday: { enabled: false, shifts: [] }
    },
    apiMode: 'managed' // Always use our managed APIs
  })
  

  const [loading, setLoading] = useState({
    barbershop: false,
    businessHours: false,
    notifications: false,
    paymentMethod: false,
    subscription: false,
    testNotifications: false
  })
  const [editStates, setEditStates] = useState({
    barbershop: false,
    businessHours: false,
    notifications: false,
    paymentMethod: false,
    subscription: false
  })
  const [errors, setErrors] = useState({})
  const [successMessages, setSuccessMessages] = useState({})
  const [activeSection, setActiveSection] = useState('general')
  const [isInitialized, setIsInitialized] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const phoneInputRef = useRef(null)
  const emailInputRef = useRef(null)

  const handlePhoneBlur = useCallback((e) => {
    const displayValue = e.target.value
    const e164Value = e.target.e164 || displayValue  // Use E.164 for Twilio if available
    const country = e.target.country || 'US'
    
    console.log('NUCLEAR: Phone blur update:', { displayValue, e164Value, country })
    
    setSettings(prev => ({
      ...prev,
      barbershop: { 
        ...prev.barbershop, 
        phone: displayValue,           // Store formatted display version
        phoneE164: e164Value,          // Store E.164 for Twilio SMS
        phoneCountry: country          // Store country for future reference
      }
    }))
  }, [])

  const handleEmailBlur = useCallback((e) => {
    const value = e.target.value
    console.log('NUCLEAR: Email blur update:', value)
    setSettings(prev => ({
      ...prev,
      barbershop: { 
        ...prev.barbershop, 
        email: value 
      }
    }))
  }, [])

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId)
    if (typeof window !== 'undefined') {
      window.location.hash = sectionId
    }
  }

  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    const validSections = ['general', 'hours', 'notifications', 'security', 'billing', 'payments', 'system']
    
    if (hash === 'api') {
      setActiveSection('general')
      window.location.hash = 'general'
      setIsInitialized(true)
      return
    }
    
    if (validSections.includes(hash)) {
      setActiveSection(hash)
    }
    setIsInitialized(true)
    
    const timer = setTimeout(() => {
      setPageLoading(false)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const validSections = ['general', 'hours', 'notifications', 'security', 'billing', 'payments', 'system']
      
      if (hash === 'api') {
        setActiveSection('general')
        window.location.hash = 'general'
        return
      }
      
      if (validSections.includes(hash)) {
        setActiveSection(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])
  const [notificationHistory, setNotificationHistory] = useState([])
  const [queueStatus, setQueueStatus] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [billingData, setBillingData] = useState({
    currentMonth: {
      total: 124.50,
      aiUsage: 67.20,
      smsUsage: 42.30,
      emailUsage: 15.00,
      comparedToLastMonth: 12.5
    },
    usage: {
      ai: { tokens: 1120000, cost: 67.20 },
      sms: { messages: 2115, cost: 42.30 },
      email: { sent: 15000, cost: 15.00 }
    },
    paymentMethod: {
      last4: '4242',
      brand: 'Visa',
      expMonth: 12,
      expYear: 2025
    },
    subscription: {
      plan: 'Professional',
      status: 'active',
      nextBilling: '2024-02-01'
    }
  })
  const [timeRange, setTimeRange] = useState('30days')
  
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const barbershopResponse = await fetch('/api/v1/settings/barbershop', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (barbershopResponse.ok) {
          const barbershopData = await barbershopResponse.json()
          setSettings(prev => ({
            ...prev,
            barbershop: barbershopData.barbershop || prev.barbershop,
            notifications: barbershopData.notifications || prev.notifications
          }))
        }

        const businessHoursResponse = await fetch('/api/v1/settings/business-hours', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        })
        
        if (businessHoursResponse.ok) {
          const businessHoursData = await businessHoursResponse.json()
          setSettings(prev => ({
            ...prev,
            businessHours: businessHoursData
          }))
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    
    loadSettings()
    
    if (activeSection === 'notifications') {
      fetchNotificationHistory()
      fetchQueueStatus()
    }
    
    if (activeSection === 'billing') {
      fetchBillingData()
    }
  }, [activeSection])

  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/v1/billing/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setBillingData(data)
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error)
    }
  }

  const fetchNotificationHistory = async () => {
    try {
      const response = await fetch('/api/v1/notifications/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotificationHistory(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notification history:', error)
    }
  }

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/v1/notifications/queue/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data)
      }
    } catch (error) {
      console.error('Error fetching queue status:', error)
    }
  }

  const sendTestNotification = async (type) => {
    setLoading(prev => ({ ...prev, testNotifications: true }))
    setTestResult(null)
    
    try {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ type })
      })
      
      const result = await response.json()
      setTestResult(result)
      
      setTimeout(fetchNotificationHistory, 1000)
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to send test notification'
      })
    } finally {
      setLoading(prev => ({ ...prev, testNotifications: false }))
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-amber-800" />
      default:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeIcon = (type) => {
    return type === 'email' ? 
      <EnvelopeIcon className="h-5 w-5 text-olive-500" /> : 
      <PhoneIcon className="h-5 w-5 text-gold-500" />
  }

  const handleEdit = (section) => {
    setEditStates(prev => ({ ...prev, [section]: true }))
    setErrors(prev => ({ ...prev, [section]: null }))
    setSuccessMessages(prev => ({ ...prev, [section]: null }))
  }

  const handleCancel = (section) => {
    setEditStates(prev => ({ ...prev, [section]: false }))
    setErrors(prev => ({ ...prev, [section]: null }))
  }

  const handleSave = async (section) => {
    try {
      setLoading(prev => ({ ...prev, [section]: true }))
      setErrors(prev => ({ ...prev, [section]: null }))
      setSuccessMessages(prev => ({ ...prev, [section]: null }))
      
      let response
      
      switch (section) {
        case 'barbershop':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(settings.barbershop.email)) {
            setErrors(prev => ({ ...prev, [section]: 'Invalid email format' }))
            return
          }
          
          response = await fetch('/api/v1/settings/barbershop', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(settings.barbershop)
          })
          break
          
        case 'businessHours':
          let hasValidationError = false
          try {
            JSON.stringify(settings.businessHours)
          } catch (error) {
            setErrors(prev => ({ ...prev, [section]: 'Invalid business hours data format' }))
            hasValidationError = true
          }
          
          if (hasValidationError) {
            return
          }
          
          response = await fetch('/api/v1/settings/business-hours', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(settings.businessHours)
          })
          break
          
        case 'notifications':
          response = await fetch('/api/v1/settings/notifications', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(settings.notifications)
          })
          break
          
        case 'paymentMethod':
          response = { ok: true }
          break
          
        case 'subscription':
          response = { ok: true }
          break
      }
      
      if (!response.ok) {
        let errorMessage = `Failed to save ${section} settings`
        try {
          const errorData = await response.json()
          if (errorData.detail) {
            errorMessage += `: ${errorData.detail}`
          }
        } catch (e) {
          errorMessage += ` (Status: ${response.status})`
        }
        throw new Error(errorMessage)
      }
      
      setSuccessMessages(prev => ({ ...prev, [section]: 'Settings saved successfully!' }))
      setEditStates(prev => ({ ...prev, [section]: false }))
      
      setTimeout(() => {
        setSuccessMessages(prev => ({ ...prev, [section]: null }))
      }, 3000)
      
    } catch (error) {
      setErrors(prev => ({ ...prev, [section]: error.message || `Error saving ${section} settings` }))
    } finally {
      setLoading(prev => ({ ...prev, [section]: false }))
    }
  }

  const settingSections = [
    { id: 'general', name: 'General', icon: BuildingOfficeIcon },
    { id: 'hours', name: 'Business Hours', icon: CalendarDaysIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'security', name: 'Security & MFA', icon: KeyIcon },
    { id: 'billing', name: 'Billing & Usage', icon: CreditCardIcon },
    { id: 'payments', name: 'Accept Payments', icon: BanknotesIcon },
    { id: 'system', name: 'System Status', icon: CogIcon }
  ]

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  const toggleDay = (day) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          enabled: !prev.businessHours[day].enabled,
          shifts: !prev.businessHours[day].enabled ? [{ open: '09:00', close: '18:00' }] : []
        }
      }
    }))
  }

  const updateShift = (day, shiftIndex, field, value) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          shifts: prev.businessHours[day].shifts.map((shift, index) => 
            index === shiftIndex ? { ...shift, [field]: value } : shift
          )
        }
      }
    }))
  }

  const addShift = (day) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          shifts: [...prev.businessHours[day].shifts, { open: '09:00', close: '18:00' }]
        }
      }
    }))
  }

  const removeShift = (day, shiftIndex) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          shifts: prev.businessHours[day].shifts.filter((_, index) => index !== shiftIndex)
        }
      }
    }))
  }

  const handleDownloadInvoice = () => {
    setTestResult({
      success: true,
      message: "Invoice download will be available soon. You'll be notified when ready."
    })
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleUpdatePayment = () => {
    setTestResult({
      success: true,
      message: "Payment method update is coming soon. Contact support for immediate changes."
    })
    setTimeout(() => setTestResult(null), 3000)
  }

  const handleViewBillingHistory = () => {
    setTestResult({
      success: true,
      message: "Billing history feature is being developed. Current month details are shown above."
    })
    setTimeout(() => setTestResult(null), 3000)
  }

  const formatTime12Hour = (time24) => {
    if (!time24) return 'Not set'
    const [hours, minutes] = time24.split(':').map(Number)
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    const ampm = hours >= 12 ? 'PM' : 'AM'
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const calculateShiftDuration = (openTime, closeTime) => {
    if (!openTime || !closeTime) return ''
    
    const [openHour, openMin] = openTime.split(':').map(Number)
    const [closeHour, closeMin] = closeTime.split(':').map(Number)
    
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    if (closeMinutes <= openMinutes) return 'Invalid'
    
    const durationMinutes = closeMinutes - openMinutes
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    
    if (minutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    } else {
      return `${hours}h ${minutes}m`
    }
  }

  const dailyUsageData = [
    { date: 'Jan 1', ai: 15.20, sms: 8.40, email: 2.10 },
    { date: 'Jan 5', ai: 22.50, sms: 12.20, email: 3.50 },
    { date: 'Jan 10', ai: 18.30, sms: 15.60, email: 4.20 },
    { date: 'Jan 15', ai: 28.90, sms: 9.80, email: 2.80 },
    { date: 'Jan 20', ai: 19.40, sms: 11.50, email: 3.10 },
    { date: 'Jan 25', ai: 25.60, sms: 14.30, email: 4.60 },
    { date: 'Jan 30', ai: 32.10, sms: 16.20, email: 5.20 }
  ]

  const usageBreakdown = [
    { name: 'AI Business Coach', value: billingData.usage.ai.cost, color: '#3B82F6' },
    { name: 'SMS Marketing', value: billingData.usage.sms.cost, color: '#C5A35B' },
    { name: 'Email Campaigns', value: billingData.usage.email.cost, color: '#10B981' }
  ]

  const EditableCard = memo(({ title, icon: Icon, section, children, className = "" }) => {
    const isEditing = editStates[section]
    const isLoading = loading[section]
    const error = errors[section]
    const successMessage = successMessages[section]

    return (
      <div className={`card ${isEditing ? 'ring-2 ring-olive-500 ring-opacity-50' : ''} ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Icon className="h-6 w-6 text-olive-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button 
                  onClick={() => handleCancel(section)} 
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleSave(section)} 
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm bg-olive-600 text-white rounded-md hover:bg-olive-700 disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button 
                onClick={() => handleEdit(section)} 
                className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
            )}
          </div>
        </div>
        
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {children}
      </div>
    )
  })

  if (!isInitialized || pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="text-gray-600 mt-4 text-lg">Loading Settings...</p>
          <p className="text-gray-400 text-sm">Optimizing components for best performance</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Global Test Result Notifications */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            testResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <p className="font-medium">{testResult.message}</p>
            {testResult.recipient && (
              <p className="text-sm mt-1">Sent to: {testResult.recipient}</p>
            )}
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Configure your barbershop and system preferences</p>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <nav className="space-y-1">
              {settingSections.map((section) => {
                const Icon = section.icon
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeSection === section.id
                        ? 'bg-olive-100 text-olive-700 border border-olive-200'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {section.name}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <EditableCard 
                  title="Barbershop Information" 
                  icon={BuildingOfficeIcon}
                  section="barbershop"
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name
                      </label>
                      {editStates.barbershop ? (
                        <input
                          type="text"
                          value={settings.barbershop.name}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            barbershop: { ...prev.barbershop, name: e.target.value }
                          }))}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{settings.barbershop.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      {editStates.barbershop ? (
                        <InternationalPhoneInput
                          ref={phoneInputRef}
                          defaultValue={settings.barbershop?.phone || ''}
                          defaultCountry={settings.barbershop?.phoneCountry || 'US'}
                          onBlur={handlePhoneBlur}
                        />
                      ) : (
                        <div>
                          <p className="text-gray-900 py-2">{settings.barbershop.phone || 'Not set'}</p>
                          {settings.barbershop?.phoneE164 && (
                            <p className="text-xs text-gray-500">Twilio format: {settings.barbershop.phoneE164}</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      {editStates.barbershop ? (
                        <input
                          type="text"
                          value={settings.barbershop.address}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            barbershop: { ...prev.barbershop, address: e.target.value }
                          }))}
                          className="input-field"
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{settings.barbershop.address}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      {editStates.barbershop ? (
                        <NuclearInput
                          ref={emailInputRef}
                          type="email"
                          defaultValue={settings.barbershop?.email || ''}
                          onBlur={handleEmailBlur}
                          placeholder="Enter email address"
                          autoFormatting={true}
                          validation={true}
                        />
                      ) : (
                        <p className="text-gray-900 py-2">{settings.barbershop.email || 'Not set'}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Timezone
                      </label>
                      {editStates.barbershop ? (
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
                      ) : (
                        <p className="text-gray-900 py-2">
                          {settings.barbershop.timezone === 'America/New_York' ? 'Eastern Time' :
                           settings.barbershop.timezone === 'America/Chicago' ? 'Central Time' :
                           settings.barbershop.timezone === 'America/Denver' ? 'Mountain Time' :
                           settings.barbershop.timezone === 'America/Los_Angeles' ? 'Pacific Time' :
                           settings.barbershop.timezone}
                        </p>
                      )}
                    </div>
                  </div>
                </EditableCard>
              </div>
            )}

            {/* Business Hours Settings */}
            {activeSection === 'hours' && (
              <div className="space-y-6">
                <EditableCard 
                  title="Business Hours" 
                  icon={CalendarDaysIcon}
                  section="businessHours"
                >
                  <div className="space-y-4">
                    {Object.entries(settings.businessHours).map(([day, config]) => (
                      <div key={day} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center">
                            <span className="text-lg font-medium text-gray-900 w-24">
                              {dayNames[day]}
                            </span>
                          </div>
                          {editStates.businessHours ? (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={() => toggleDay(day)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                            </label>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              config.enabled ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {config.enabled ? 'Open' : 'Closed'}
                            </span>
                          )}
                        </div>
                        
                        {config.enabled && (
                          <div className="space-y-3">
                            {config.shifts.map((shift, shiftIndex) => (
                              <div key={shiftIndex} className="bg-gray-50 p-4 rounded-lg">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    {editStates.businessHours ? (
                                      <TimeRangePicker
                                        openTime={shift.open}
                                        closeTime={shift.close}
                                        onOpenTimeChange={(time) => updateShift(day, shiftIndex, 'open', time)}
                                        onCloseTimeChange={(time) => updateShift(day, shiftIndex, 'close', time)}
                                        showLabels={shiftIndex === 0}
                                        className="w-full"
                                      />
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                          <div className="text-sm">
                                            <span className="font-medium text-gray-700">Open:</span>
                                            <span className="ml-2 text-gray-900">{formatTime12Hour(shift.open)}</span>
                                          </div>
                                          <div className="text-sm">
                                            <span className="font-medium text-gray-700">Close:</span>
                                            <span className="ml-2 text-gray-900">{formatTime12Hour(shift.close)}</span>
                                          </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {calculateShiftDuration(shift.open, shift.close)}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  {editStates.businessHours && config.shifts.length > 1 && (
                                    <button
                                      onClick={() => removeShift(day, shiftIndex)}
                                      className="ml-3 text-red-600 hover:text-red-800 p-1"
                                      title="Remove shift"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                                {shiftIndex < config.shifts.length - 1 && (
                                  <div className="mt-2 pt-2 border-t border-gray-200">
                                    <span className="text-xs text-gray-500">Shift {shiftIndex + 1}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            {editStates.businessHours && (
                              <button
                                onClick={() => addShift(day)}
                                className="flex items-center justify-center w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:text-olive-600 hover:border-olive-300 transition-colors"
                              >
                                <PlusIcon className="h-4 w-4 mr-1" />
                                Add another shift
                              </button>
                            )}
                          </div>
                        )}
                        
                        {!config.enabled && (
                          <div className="text-center py-4 text-gray-500">
                            <span className="text-sm">Closed</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </EditableCard>

                {/* Quick Templates - Only show in edit mode */}
                {editStates.businessHours && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Quick Templates
                      <span className="ml-2 text-sm font-normal text-gray-500">Choose a common schedule</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <button
                        onClick={() => {
                          const standardHours = {
                            monday: { enabled: true, shifts: [{ open: '09:00', close: '17:00' }] },
                            tuesday: { enabled: true, shifts: [{ open: '09:00', close: '17:00' }] },
                            wednesday: { enabled: true, shifts: [{ open: '09:00', close: '17:00' }] },
                            thursday: { enabled: true, shifts: [{ open: '09:00', close: '17:00' }] },
                            friday: { enabled: true, shifts: [{ open: '09:00', close: '17:00' }] },
                            saturday: { enabled: false, shifts: [] },
                            sunday: { enabled: false, shifts: [] }
                          }
                          setSettings(prev => ({ ...prev, businessHours: standardHours }))
                        }}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:bg-olive-50 hover:border-olive-300 transition-colors text-left group"
                      >
                        <h4 className="font-medium text-gray-900 group-hover:text-olive-900">Standard 9-5</h4>
                        <p className="text-sm text-gray-600 mt-1">Mon-Fri • 9:00 AM - 5:00 PM</p>
                        <p className="text-xs text-gray-500 mt-2">40 hours/week</p>
                      </button>
                      
                      <button
                        onClick={() => {
                          const barbershopHours = {
                            monday: { enabled: false, shifts: [] },
                            tuesday: { enabled: true, shifts: [{ open: '09:00', close: '19:00' }] },
                            wednesday: { enabled: true, shifts: [{ open: '09:00', close: '19:00' }] },
                            thursday: { enabled: true, shifts: [{ open: '09:00', close: '19:00' }] },
                            friday: { enabled: true, shifts: [{ open: '09:00', close: '19:00' }] },
                            saturday: { enabled: true, shifts: [{ open: '08:00', close: '18:00' }] },
                            sunday: { enabled: true, shifts: [{ open: '10:00', close: '16:00' }] }
                          }
                          setSettings(prev => ({ ...prev, businessHours: barbershopHours }))
                        }}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:bg-olive-50 hover:border-olive-300 transition-colors text-left group"
                      >
                        <h4 className="font-medium text-gray-900 group-hover:text-olive-900">Classic Barbershop</h4>
                        <p className="text-sm text-gray-600 mt-1">Tue-Sun • Closed Mondays</p>
                        <p className="text-xs text-gray-500 mt-2">56 hours/week</p>
                      </button>
                      
                      <button
                        onClick={() => {
                          const extendedHours = {
                            monday: { enabled: true, shifts: [{ open: '08:00', close: '20:00' }] },
                            tuesday: { enabled: true, shifts: [{ open: '08:00', close: '20:00' }] },
                            wednesday: { enabled: true, shifts: [{ open: '08:00', close: '20:00' }] },
                            thursday: { enabled: true, shifts: [{ open: '08:00', close: '20:00' }] },
                            friday: { enabled: true, shifts: [{ open: '08:00', close: '20:00' }] },
                            saturday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
                            sunday: { enabled: true, shifts: [{ open: '11:00', close: '17:00' }] }
                          }
                          setSettings(prev => ({ ...prev, businessHours: extendedHours }))
                        }}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:bg-olive-50 hover:border-olive-300 transition-colors text-left group"
                      >
                        <h4 className="font-medium text-gray-900 group-hover:text-olive-900">Extended Hours</h4>
                        <p className="text-sm text-gray-600 mt-1">7 days • Early to late</p>
                        <p className="text-xs text-gray-500 mt-2">75 hours/week</p>
                      </button>
                      
                      <button
                        onClick={() => {
                          const weekendHours = {
                            monday: { enabled: false, shifts: [] },
                            tuesday: { enabled: false, shifts: [] },
                            wednesday: { enabled: false, shifts: [] },
                            thursday: { enabled: false, shifts: [] },
                            friday: { enabled: false, shifts: [] },
                            saturday: { enabled: true, shifts: [{ open: '09:00', close: '18:00' }] },
                            sunday: { enabled: true, shifts: [{ open: '10:00', close: '16:00' }] }
                          }
                          setSettings(prev => ({ ...prev, businessHours: weekendHours }))
                        }}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:bg-olive-50 hover:border-olive-300 transition-colors text-left group"
                      >
                        <h4 className="font-medium text-gray-900 group-hover:text-olive-900">Weekend Only</h4>
                        <p className="text-sm text-gray-600 mt-1">Sat-Sun only</p>
                        <p className="text-xs text-gray-500 mt-2">15 hours/week</p>
                      </button>
                    </div>
                    
                    <div className="mt-4 p-3 bg-olive-50 border border-olive-200 rounded-lg">
                      <p className="text-sm text-olive-800">
                        💡 <strong>Tip:</strong> Most barbershops find success with 50-60 hours per week, including evenings and weekends when customers are available.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                {/* Notification Preferences */}
                <EditableCard 
                  title="Notification Preferences" 
                  icon={BellIcon}
                  section="notifications"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <EnvelopeIcon className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">Email Notifications</span>
                      </div>
                      {editStates.notifications ? (
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                        </label>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings.notifications.emailEnabled ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {settings.notifications.emailEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <PhoneIcon className="h-4 w-4 text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                      </div>
                      {editStates.notifications ? (
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                        </label>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings.notifications.smsEnabled ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {settings.notifications.smsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Campaign Alerts</span>
                      {editStates.notifications ? (
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                        </label>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings.notifications.campaignAlerts ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {settings.notifications.campaignAlerts ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Booking Alerts</span>
                      {editStates.notifications ? (
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                        </label>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings.notifications.bookingAlerts ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {settings.notifications.bookingAlerts ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">System Alerts</span>
                      {editStates.notifications ? (
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
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                        </label>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          settings.notifications.systemAlerts ? 'bg-moss-100 text-moss-900' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {settings.notifications.systemAlerts ? 'Enabled' : 'Disabled'}
                        </span>
                      )}
                    </div>
                  </div>
                </EditableCard>

                {/* Test Notifications */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Notifications</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => sendTestNotification('email')}
                      disabled={loading.testNotifications}
                      className="flex items-center justify-center space-x-3 p-4 border-2 border-olive-200 rounded-lg hover:bg-olive-50 transition-colors disabled:opacity-50"
                    >
                      <EnvelopeIcon className="h-8 w-8 text-olive-600" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Test Email</p>
                        <p className="text-sm text-gray-600">Send test email</p>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => sendTestNotification('sms')}
                      disabled={loading.testNotifications}
                      className="flex items-center justify-center space-x-3 p-4 border-2 border-gold-200 rounded-lg hover:bg-gold-50 transition-colors disabled:opacity-50"
                    >
                      <PhoneIcon className="h-8 w-8 text-gold-600" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Test SMS</p>
                        <p className="text-sm text-gray-600">Send test SMS</p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Notification History */}
                <div className="card">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Notifications</h3>
                  
                  {notificationHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <BellIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No notifications sent yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Recipient
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Subject
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Sent At
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {notificationHistory.slice(0, 5).map((notification) => (
                            <tr key={notification.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {getTypeIcon(notification.type)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {notification.recipient}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {notification.subject || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {getStatusIcon(notification.status)}
                                  <span className="ml-2 text-sm text-gray-900">
                                    {notification.status}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(notification.sent_at).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Queue Status */}
                {queueStatus && (
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Processing</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {queueStatus.processing ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Total in Queue</p>
                        <p className="text-2xl font-bold text-gray-900">{queueStatus.total || 0}</p>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-500">Next Scheduled</p>
                        <p className="text-sm font-bold text-gray-900">
                          {queueStatus.next_scheduled ? 
                            new Date(queueStatus.next_scheduled).toLocaleString() : 
                            'None'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security & MFA Settings */}
            {activeSection === 'security' && (
              <div className="space-y-6">
                {/* MFA Setup Section */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <KeyIcon className="h-6 w-6 text-olive-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Multi-Factor Authentication</h3>
                        <p className="text-sm text-gray-600">Secure your account with an additional layer of protection</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-olive-50 to-indigo-50 border border-olive-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-8 w-8 rounded-md bg-olive-500">
                          <CheckCircleIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-olive-900">Enhanced Security Available</h3>
                        <div className="mt-2 text-sm text-olive-800">
                          <p>Set up multi-factor authentication to protect your barbershop data and customer information.</p>
                        </div>
                        <div className="mt-4">
                          <div className="flex space-x-4 text-sm">
                            <div className="flex items-center text-olive-700">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              TOTP Authentication
                            </div>
                            <div className="flex items-center text-olive-700">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Backup Recovery Codes
                            </div>
                            <div className="flex items-center text-olive-700">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Device Trust Management
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* MFA Setup Component */}
                  <MFASetup 
                    onComplete={(success) => {
                      if (success) {
                        setTestResult({
                          success: true,
                          message: 'Multi-factor authentication has been successfully enabled!'
                        })
                        setTimeout(() => setTestResult(null), 5000)
                      }
                    }}
                  />
                </div>

                {/* Subscription Management Section */}
                <div className="card">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <CreditCardIcon className="h-6 w-6 text-olive-600 mr-3" />
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Subscription & Billing</h3>
                        <p className="text-sm text-gray-600">Manage your subscription plan and payment methods</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subscription Dashboard Component */}
                  <SubscriptionDashboard />
                </div>

                {/* Security Settings */}
                <div className="card">
                  <div className="flex items-center mb-6">
                    <KeyIcon className="h-6 w-6 text-olive-600 mr-3" />
                    <h3 className="text-lg font-semibold text-gray-900">Security Settings</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">Session Management</div>
                        <div className="text-sm text-gray-600">Control how long you stay logged in</div>
                      </div>
                      <select className="text-sm border border-gray-300 rounded-md px-3 py-1">
                        <option value="24h">24 hours</option>
                        <option value="7d">7 days</option>
                        <option value="30d">30 days</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">Login Notifications</div>
                        <div className="text-sm text-gray-600">Get notified of new login attempts</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-olive-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">Password Requirements</div>
                        <div className="text-sm text-gray-600">Enforce strong password policies</div>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-moss-100 text-moss-900">
                        Enabled
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing & Usage Settings */}
            {activeSection === 'billing' && (
              <div className="space-y-6">
                {/* Current Month Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Current Month Total</span>
                      <CreditCardIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold text-gray-900">${billingData.currentMonth.total}</span>
                    </div>
                    <div className="flex items-center mt-2">
                      {billingData.currentMonth.comparedToLastMonth > 0 ? (
                        <>
                          <ArrowTrendingUpIcon className="h-4 w-4 text-red-500 mr-1" />
                          <span className="text-sm text-red-600">+{billingData.currentMonth.comparedToLastMonth}%</span>
                        </>
                      ) : (
                        <>
                          <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm text-green-600">{billingData.currentMonth.comparedToLastMonth}%</span>
                        </>
                      )}
                      <span className="text-sm text-gray-500 ml-1">vs last month</span>
                    </div>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">AI Usage</span>
                      <div className="h-2 w-2 bg-olive-500 rounded-full"></div>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-900">${billingData.usage.ai.cost}</span>
                    </div>
                    <span className="text-sm text-gray-500">{(billingData.usage.ai.tokens / 1000).toFixed(0)}K tokens</span>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">SMS Usage</span>
                      <div className="h-2 w-2 bg-gold-500 rounded-full"></div>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-900">${billingData.usage.sms.cost}</span>
                    </div>
                    <span className="text-sm text-gray-500">{billingData.usage.sms.messages.toLocaleString()} messages</span>
                  </div>

                  <div className="card">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Email Usage</span>
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="flex items-baseline">
                      <span className="text-2xl font-bold text-gray-900">${billingData.usage.email.cost}</span>
                    </div>
                    <span className="text-sm text-gray-500">{billingData.usage.email.sent.toLocaleString()} emails</span>
                  </div>
                </div>

                {/* Payment Method */}
                <EditableCard 
                  title="Payment Method" 
                  icon={CreditCardIcon}
                  section="paymentMethod"
                  className="mb-8"
                >
                  {editStates.paymentMethod ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Card Number
                          </label>
                          <input
                            type="text"
                            placeholder="•••• •••• •••• 4242"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expiry Date
                          </label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CVV
                          </label>
                          <input
                            type="text"
                            placeholder="123"
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cardholder Name
                          </label>
                          <input
                            type="text"
                            placeholder="Enter cardholder name"
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <CreditCardIcon className="h-10 w-10 text-gray-400 mr-4" />
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            {billingData.paymentMethod.brand} •••• {billingData.paymentMethod.last4}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expires {billingData.paymentMethod.expMonth}/{billingData.paymentMethod.expYear}
                          </p>
                        </div>
                      </div>
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    </div>
                  )}
                </EditableCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Usage Trends */}
                  <div className="lg:col-span-2">
                    <div className="card">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-900">Usage Trends</h3>
                        <select 
                          value={timeRange} 
                          onChange={(e) => setTimeRange(e.target.value)}
                          className="text-sm border border-gray-300 rounded-md px-3 py-1"
                        >
                          <option value="7days">Last 7 days</option>
                          <option value="30days">Last 30 days</option>
                          <option value="90days">Last 90 days</option>
                        </select>
                      </div>
                      
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyUsageData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value}`} />
                          <Legend />
                          <Line type="monotone" dataKey="ai" stroke="#3B82F6" name="AI" strokeWidth={2} />
                          <Line type="monotone" dataKey="sms" stroke="#C5A35B" name="SMS" strokeWidth={2} />
                          <Line type="monotone" dataKey="email" stroke="#10B981" name="Email" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Detailed Usage */}
                    <div className="card mt-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-6">Detailed Usage Breakdown</h3>
                      
                      <div className="space-y-4">
                        <div className="border-b pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">AI Business Coach</h4>
                              <p className="text-sm text-gray-600">GPT-4 & Claude API calls</p>
                            </div>
                            <span className="font-semibold text-gray-900">${billingData.usage.ai.cost}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{(billingData.usage.ai.tokens / 1000).toFixed(0)}K tokens × $0.04/1K = ${billingData.usage.ai.cost}</p>
                          </div>
                        </div>

                        <div className="border-b pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">SMS Marketing</h4>
                              <p className="text-sm text-gray-600">Appointment reminders & campaigns</p>
                            </div>
                            <span className="font-semibold text-gray-900">${billingData.usage.sms.cost}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{billingData.usage.sms.messages} messages × $0.01/msg = ${billingData.usage.sms.cost}</p>
                          </div>
                        </div>

                        <div className="pb-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium text-gray-900">Email Campaigns</h4>
                              <p className="text-sm text-gray-600">Marketing emails & newsletters</p>
                            </div>
                            <span className="font-semibold text-gray-900">${billingData.usage.email.cost}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>{billingData.usage.email.sent.toLocaleString()} emails × $0.001/email = ${billingData.usage.email.cost}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-gray-900">Total for January</span>
                          <span className="text-xl font-bold text-gray-900">${billingData.currentMonth.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-6">
                    {/* Usage Distribution */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Distribution</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={usageBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {usageBreakdown.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${value}`} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2">
                        {usageBreakdown.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center">
                              <div className={`h-3 w-3 rounded-full mr-2`} style={{ backgroundColor: item.color }}></div>
                              <span className="text-gray-700">{item.name}</span>
                            </div>
                            <span className="font-medium text-gray-900">{((item.value / billingData.currentMonth.total) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>


                    {/* Subscription */}
                    <EditableCard 
                      title="Subscription" 
                      icon={ChartBarIcon}
                      section="subscription"
                    >
                      {editStates.subscription ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Plan
                            </label>
                            <select
                              defaultValue={billingData.subscription.plan}
                              className="input-field"
                            >
                              <option value="Starter">Starter - $29/month</option>
                              <option value="Professional">Professional - $79/month</option>
                              <option value="Enterprise">Enterprise - $199/month</option>
                            </select>
                          </div>
                          <div className="p-4 bg-olive-50 border border-olive-200 rounded-md">
                            <h4 className="font-medium text-olive-900 mb-1">Plan Change Impact</h4>
                            <p className="text-sm text-olive-800">
                              Changes will be prorated and applied on your next billing cycle ({billingData.subscription.nextBilling}).
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Plan</span>
                            <span className="font-medium text-gray-900">{billingData.subscription.plan}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-moss-100 text-moss-900">
                              {billingData.subscription.status}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Next billing</span>
                            <span className="font-medium text-gray-900">{billingData.subscription.nextBilling}</span>
                          </div>
                        </div>
                      )}
                    </EditableCard>

                    {/* Actions */}
                    <div className="card">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Actions</h3>
                      <div className="space-y-3">
                        <button 
                          onClick={handleDownloadInvoice}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                          Download Invoice
                        </button>
                        <button 
                          onClick={handleViewBillingHistory}
                          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <CalendarDaysIcon className="h-4 w-4 mr-2" />
                          View Billing History
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Payment Processing Settings */}
            {activeSection === 'payments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900">Accept Customer Payments</h2>
                    <p className="text-gray-600 mt-1">Set up Stripe to accept credit cards and digital payments from customers</p>
                  </div>
                </div>
                
                <PaymentProcessingSettings />
              </div>
            )}

            {/* System Status */}
            {activeSection === 'system' && (
              <div className="card">
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
}