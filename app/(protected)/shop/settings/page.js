'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { 
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ClockIcon,
  CreditCardIcon,
  PhotoIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  CalendarDaysIcon,
  BellIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

export default function ShopSettings() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [shopData, setShopData] = useState({
    // General Info
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    
    // Address
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    
    // Business Hours
    hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '10:00', close: '17:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    },
    
    // Payment Settings
    payment: {
      acceptCash: true,
      acceptCard: true,
      acceptOnline: true,
      taxRate: 8.5,
      cancellationFee: 25,
      noShowFee: 50,
      depositRequired: false,
      depositAmount: 0
    },
    
    // Commission Settings
    commission: {
      defaultRate: 60, // Barber gets 60%
      productCommission: 20, // Barber gets 20% on products
      tipHandling: 'barber', // 'barber' or 'shop'
    },
    
    // Booking Settings
    booking: {
      advanceBookingDays: 30,
      minBookingHours: 2,
      maxBookingsPerDay: 50,
      autoConfirm: true,
      requirePhone: true,
      requireEmail: false,
      allowWalkIns: true,
      bufferTime: 15 // Minutes between appointments
    },
    
    // Notifications
    notifications: {
      emailBookings: true,
      emailCancellations: true,
      smsBookings: false,
      smsCancellations: false,
      dailyReport: true,
      weeklyReport: true
    }
  })

  useEffect(() => {
    loadShopSettings()
  }, [user])

  const loadShopSettings = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Get shop data
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      
      if (error) {
        console.error('Error loading shop:', error)
        // Keep default empty data on error - no mock data
        alert('Failed to load shop settings. Please check your connection.')
      } else if (shop) {
        // Merge shop data with defaults
        setShopData(prev => ({
          ...prev,
          name: shop.name || prev.name,
          description: shop.description || prev.description,
          email: shop.email || prev.email,
          phone: shop.phone || prev.phone,
          website: shop.website || prev.website,
          address: shop.address || prev.address,
          city: shop.city || prev.city,
          state: shop.state || prev.state,
          zip: shop.zip || prev.zip,
          // Parse JSON fields if they exist
          hours: shop.business_hours ? JSON.parse(shop.business_hours) : prev.hours,
          payment: shop.payment_settings ? JSON.parse(shop.payment_settings) : prev.payment,
          commission: shop.commission_settings ? JSON.parse(shop.commission_settings) : prev.commission,
          booking: shop.booking_settings ? JSON.parse(shop.booking_settings) : prev.booking,
          notifications: shop.notification_settings ? JSON.parse(shop.notification_settings) : prev.notifications
        }))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          name: shopData.name,
          description: shopData.description,
          email: shopData.email,
          phone: shopData.phone,
          website: shopData.website,
          address: shopData.address,
          city: shopData.city,
          state: shopData.state,
          zip: shopData.zip,
          country: shopData.country,
          business_hours: JSON.stringify(shopData.hours),
          payment_settings: JSON.stringify(shopData.payment),
          commission_settings: JSON.stringify(shopData.commission),
          booking_settings: JSON.stringify(shopData.booking),
          notification_settings: JSON.stringify(shopData.notifications),
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user?.id)
      
      if (error) {
        console.error('Error saving settings:', error)
        alert('Failed to save settings. Please try again.')
      } else {
        alert('Settings saved successfully!')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('An error occurred while saving.')
    } finally {
      setSaving(false)
    }
  }

  const updateHours = (day, field, value) => {
    setShopData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [day]: {
          ...prev.hours[day],
          [field]: value
        }
      }
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
              <p className="text-sm text-gray-600">Manage your barbershop configuration</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'general', label: 'General Info', icon: BuildingStorefrontIcon },
              { id: 'hours', label: 'Business Hours', icon: ClockIcon },
              { id: 'payment', label: 'Payment & Commission', icon: CreditCardIcon },
              { id: 'booking', label: 'Booking Settings', icon: CalendarDaysIcon },
              { id: 'staff', label: 'Staff Permissions', icon: UserGroupIcon },
              { id: 'notifications', label: 'Notifications', icon: BellIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-olive-500 text-olive-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* General Info Tab */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">General Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Name
                  </label>
                  <input
                    type="text"
                    value={shopData.name}
                    onChange={(e) => setShopData({...shopData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={shopData.email}
                    onChange={(e) => setShopData({...shopData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={shopData.phone}
                    onChange={(e) => setShopData({...shopData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    type="url"
                    value={shopData.website}
                    onChange={(e) => setShopData({...shopData, website: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={shopData.description}
                    onChange={(e) => setShopData({...shopData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Brief description of your barbershop..."
                  />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={shopData.address}
                    onChange={(e) => setShopData({...shopData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={shopData.city}
                    onChange={(e) => setShopData({...shopData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={shopData.state}
                    onChange={(e) => setShopData({...shopData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    maxLength={2}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={shopData.zip}
                    onChange={(e) => setShopData({...shopData, zip: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={shopData.country}
                    onChange={(e) => setShopData({...shopData, country: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Business Hours Tab */}
          {activeTab === 'hours' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Business Hours</h2>
              
              <div className="space-y-4">
                {Object.entries(shopData.hours).map(([day, hours]) => (
                  <div key={day} className="flex items-center space-x-4 py-3 border-b">
                    <div className="w-32">
                      <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={!hours.closed}
                      onChange={(e) => updateHours(day, 'closed', !e.target.checked)}
                      className="h-4 w-4 text-olive-600 rounded"
                    />
                    
                    {!hours.closed && (
                      <>
                        <input
                          type="time"
                          value={hours.open}
                          onChange={(e) => updateHours(day, 'open', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={hours.close}
                          onChange={(e) => updateHours(day, 'close', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </>
                    )}
                    
                    {hours.closed && (
                      <span className="text-sm text-gray-500">Closed</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-olive-50 rounded-lg">
                <p className="text-sm text-olive-800">
                  💡 Tip: Set accurate business hours to help clients book appointments at the right times.
                </p>
              </div>
            </div>
          )}

          {/* Payment & Commission Tab */}
          {activeTab === 'payment' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment & Commission Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Accepted Payment Methods</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.payment.acceptCash}
                        onChange={(e) => setShopData({
                          ...shopData,
                          payment: {...shopData.payment, acceptCash: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Cash</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.payment.acceptCard}
                        onChange={(e) => setShopData({
                          ...shopData,
                          payment: {...shopData.payment, acceptCard: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Credit/Debit Card</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.payment.acceptOnline}
                        onChange={(e) => setShopData({
                          ...shopData,
                          payment: {...shopData.payment, acceptOnline: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Online Payment</span>
                    </label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      value={shopData.payment.taxRate}
                      onChange={(e) => setShopData({
                        ...shopData,
                        payment: {...shopData.payment, taxRate: parseFloat(e.target.value)}
                      })}
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cancellation Fee ($)
                    </label>
                    <input
                      type="number"
                      value={shopData.payment.cancellationFee}
                      onChange={(e) => setShopData({
                        ...shopData,
                        payment: {...shopData.payment, cancellationFee: parseFloat(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      No-Show Fee ($)
                    </label>
                    <input
                      type="number"
                      value={shopData.payment.noShowFee}
                      onChange={(e) => setShopData({
                        ...shopData,
                        payment: {...shopData.payment, noShowFee: parseFloat(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Commission Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Commission (% to Barber)
                      </label>
                      <input
                        type="number"
                        value={shopData.commission.defaultRate}
                        onChange={(e) => setShopData({
                          ...shopData,
                          commission: {...shopData.commission, defaultRate: parseFloat(e.target.value)}
                        })}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Commission (% to Barber)
                      </label>
                      <input
                        type="number"
                        value={shopData.commission.productCommission}
                        onChange={(e) => setShopData({
                          ...shopData,
                          commission: {...shopData.commission, productCommission: parseFloat(e.target.value)}
                        })}
                        min="0"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tips Go To
                      </label>
                      <select
                        value={shopData.commission.tipHandling}
                        onChange={(e) => setShopData({
                          ...shopData,
                          commission: {...shopData.commission, tipHandling: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="barber">100% to Barber</option>
                        <option value="shop">Split with Shop</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Booking Settings Tab */}
          {activeTab === 'booking' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Booking Settings</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Advance Booking (Days)
                  </label>
                  <input
                    type="number"
                    value={shopData.booking.advanceBookingDays}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, advanceBookingDays: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Booking Notice (Hours)
                  </label>
                  <input
                    type="number"
                    value={shopData.booking.minBookingHours}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, minBookingHours: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Bookings Per Day
                  </label>
                  <input
                    type="number"
                    value={shopData.booking.maxBookingsPerDay}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, maxBookingsPerDay: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Buffer Time Between Appointments (Minutes)
                  </label>
                  <input
                    type="number"
                    value={shopData.booking.bufferTime}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, bufferTime: parseInt(e.target.value)}
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              
              <div className="mt-6 space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shopData.booking.autoConfirm}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, autoConfirm: e.target.checked}
                    })}
                    className="h-4 w-4 text-olive-600 rounded mr-3"
                  />
                  <span className="text-sm text-gray-700">Auto-confirm bookings</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shopData.booking.requirePhone}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, requirePhone: e.target.checked}
                    })}
                    className="h-4 w-4 text-olive-600 rounded mr-3"
                  />
                  <span className="text-sm text-gray-700">Require phone number</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shopData.booking.requireEmail}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, requireEmail: e.target.checked}
                    })}
                    className="h-4 w-4 text-olive-600 rounded mr-3"
                  />
                  <span className="text-sm text-gray-700">Require email address</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={shopData.booking.allowWalkIns}
                    onChange={(e) => setShopData({
                      ...shopData,
                      booking: {...shopData.booking, allowWalkIns: e.target.checked}
                    })}
                    className="h-4 w-4 text-olive-600 rounded mr-3"
                  />
                  <span className="text-sm text-gray-700">Allow walk-in appointments</span>
                </label>
              </div>
            </div>
          )}

          {/* Staff Permissions Tab */}
          {activeTab === 'staff' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Staff Permissions</h2>
                  <p className="text-gray-600">Manage barber access and service permissions</p>
                </div>
                <a
                  href="/shop/settings/staff"
                  className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
                >
                  <UserGroupIcon className="h-5 w-5 mr-2" />
                  Manage Permissions
                </a>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-olive-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-olive-100 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-olive-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-olive-900">Basic Level</p>
                      <p className="text-xs text-olive-700">View schedule, set availability</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Intermediate Level</p>
                      <p className="text-xs text-green-700">Service management, limited pricing</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gold-50 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-lg bg-gold-100 flex items-center justify-center">
                      <UserGroupIcon className="h-6 w-6 text-gold-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gold-900">Advanced Level</p>
                      <p className="text-xs text-gold-700">Full service control, analytics</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Default new barber permissions:</span>
                    <span className="font-medium text-gray-900">Basic Level</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Pricing variance allowed:</span>
                    <span className="font-medium text-gray-900">±10%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Service creation permission:</span>
                    <span className="font-medium text-gray-900">Intermediate+</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Analytics access:</span>
                    <span className="font-medium text-gray-900">Advanced+</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.emailBookings}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, emailBookings: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">New booking notifications</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.emailCancellations}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, emailCancellations: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Cancellation notifications</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.dailyReport}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, dailyReport: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Daily summary report</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.weeklyReport}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, weeklyReport: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Weekly performance report</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">SMS Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.smsBookings}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, smsBookings: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">New booking SMS alerts</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.notifications.smsCancellations}
                        onChange={(e) => setShopData({
                          ...shopData,
                          notifications: {...shopData.notifications, smsCancellations: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Cancellation SMS alerts</span>
                    </label>
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