'use client'

import SettingsDashboard from '@/components/shop/SettingsDashboard'

export default function ShopSettings() {
  return <SettingsDashboard />
}

// Legacy code - keeping for reference during migration
function LegacyShopSettings() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [notification, setNotification] = useState({ show: false, type: '', message: '' })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [shopId, setShopId] = useState(null)
  const [shopData, setShopData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    
    address: '',
    city: '',
    state: '',
    zip_code: '',
    country: 'USA',
    
    hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '19:00', closed: false },
      saturday: { open: '10:00', close: '17:00', closed: false },
      sunday: { open: '00:00', close: '00:00', closed: true }
    },
    
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
    
    commission: {
      defaultRate: 60, // Barber gets 60%
      productCommission: 20, // Barber gets 20% on products
      tipHandling: 'barber', // 'barber' or 'shop'
    },
    
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
    
    notifications: {
      emailBookings: true,
      emailCancellations: true,
      smsBookings: false,
      smsCancellations: false,
      dailyReport: true,
      weeklyReport: true
    },
    
    appointment: {
      defaultDuration: 30,
      slotIntervals: [15, 30, 45, 60],
      bufferBetweenAppointments: 5,
      maxPerCustomerPerDay: 1,
      allowDoubleBooking: false,
      requireDeposit: false,
      depositPercentage: 20
    },
    
    tax: {
      salesTaxRate: 8.5,
      includeTaxInPrice: false,
      taxIdNumber: '',
      businessLicenseNumber: '',
      insuranceProvider: '',
      insurancePolicyNumber: ''
    }
  })

  useEffect(() => {
    loadShopSettings()
  }, [user])

  const loadShopSettings = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .single()
      
      if (error) {
        console.error('Error loading shop:', error)
        setNotification({
          show: true,
          type: 'error',
          message: 'Failed to load shop settings. Please check your connection.'
        })
      } else if (shop) {
        setShopId(shop.id)
        
        // Helper function to safely parse JSONB data
        const safeParseJSON = (data, fallback) => {
          if (!data) return fallback
          if (typeof data === 'object') return data
          if (typeof data === 'string') {
            try {
              return JSON.parse(data)
            } catch (e) {
              console.warn('Failed to parse JSON:', data)
              return fallback
            }
          }
          return fallback
        }
        
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
          zip_code: shop.zip_code || prev.zip_code,
          hours: safeParseJSON(shop.business_hours, prev.hours),
          payment: safeParseJSON(shop.payment_settings, prev.payment),
          commission: safeParseJSON(shop.commission_settings, prev.commission),
          booking: safeParseJSON(shop.booking_settings, prev.booking),
          notifications: safeParseJSON(shop.notification_settings, prev.notifications),
          appointment: safeParseJSON(shop.appointment_settings, prev.appointment),
          tax: safeParseJSON(shop.tax_settings, prev.tax)
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
    setNotification({ show: false, type: '', message: '' })
    
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
          zip_code: shopData.zip_code,
          country: shopData.country,
          business_hours: shopData.hours,
          payment_settings: shopData.payment,
          commission_settings: shopData.commission,
          booking_settings: shopData.booking,
          notification_settings: shopData.notifications,
          appointment_settings: shopData.appointment,
          tax_settings: shopData.tax,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user?.id)
      
      if (error) {
        console.error('Error saving settings:', error)
        setNotification({
          show: true,
          type: 'error',
          message: `Failed to save settings: ${error.message}`
        })
      } else {
        setHasUnsavedChanges(false)
        setNotification({
          show: true,
          type: 'success',
          message: 'Settings saved successfully!'
        })
        setTimeout(() => {
          setNotification({ show: false, type: '', message: '' })
        }, 3000)
      }
    } catch (error) {
      console.error('Error saving:', error)
      setNotification({
        show: true,
        type: 'error',
        message: 'An unexpected error occurred while saving.'
      })
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
      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className={`flex items-center px-4 py-3 rounded-lg shadow-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className={`text-sm font-medium ${
              notification.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {notification.message}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
              <p className="text-sm text-gray-600">Manage your barbershop configuration</p>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
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
              { id: 'processing', label: 'Payment Processing', icon: BanknotesIcon },
              { id: 'booking', label: 'Booking Settings', icon: CalendarDaysIcon },
              { id: 'appointments', label: 'Appointments', icon: CogIcon },
              { id: 'tax', label: 'Tax & Compliance', icon: PhotoIcon },
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
                    value={shopData.zip_code}
                    onChange={(e) => setShopData({...shopData, zip_code: e.target.value})}
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

          {/* Payment Processing Tab - Stripe Connect */}
          {activeTab === 'processing' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Payment Processing</h2>
                <p className="text-gray-600">Accept credit cards and digital payments through Stripe</p>
              </div>
              <div className="p-6">
                <PaymentProcessingSettings />
              </div>
            </div>
          )}

          {/* Appointments Configuration Tab */}
          {activeTab === 'appointments' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Appointment Configuration</h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Appointment Duration (Minutes)
                    </label>
                    <select
                      value={shopData.appointment.defaultDuration}
                      onChange={(e) => setShopData({
                        ...shopData,
                        appointment: {...shopData.appointment, defaultDuration: parseInt(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Buffer Between Appointments (Minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={shopData.appointment.bufferBetweenAppointments}
                      onChange={(e) => setShopData({
                        ...shopData,
                        appointment: {...shopData.appointment, bufferBetweenAppointments: parseInt(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Bookings Per Customer Per Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={shopData.appointment.maxPerCustomerPerDay}
                      onChange={(e) => setShopData({
                        ...shopData,
                        appointment: {...shopData.appointment, maxPerCustomerPerDay: parseInt(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deposit Percentage (if required)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={shopData.appointment.depositPercentage}
                      onChange={(e) => setShopData({
                        ...shopData,
                        appointment: {...shopData.appointment, depositPercentage: parseInt(e.target.value)}
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Appointment Policies</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.appointment.allowDoubleBooking}
                        onChange={(e) => setShopData({
                          ...shopData,
                          appointment: {...shopData.appointment, allowDoubleBooking: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Allow double booking (multiple barbers same time slot)</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={shopData.appointment.requireDeposit}
                        onChange={(e) => setShopData({
                          ...shopData,
                          appointment: {...shopData.appointment, requireDeposit: e.target.checked}
                        })}
                        className="h-4 w-4 text-olive-600 rounded mr-3"
                      />
                      <span className="text-sm text-gray-700">Require deposit for appointments</span>
                    </label>
                  </div>
                </div>
                
                <div className="p-4 bg-olive-50 rounded-lg">
                  <p className="text-sm text-olive-800">
                    💡 Tip: Configure these settings based on your typical service duration and shop capacity. Buffer time helps prevent delays between appointments.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tax & Compliance Tab */}
          {activeTab === 'tax' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Tax & Compliance Settings</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Tax Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sales Tax Rate (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={shopData.tax.salesTaxRate}
                        onChange={(e) => setShopData({
                          ...shopData,
                          tax: {...shopData.tax, salesTaxRate: parseFloat(e.target.value)}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={shopData.tax.includeTaxInPrice}
                          onChange={(e) => setShopData({
                            ...shopData,
                            tax: {...shopData.tax, includeTaxInPrice: e.target.checked}
                          })}
                          className="h-4 w-4 text-olive-600 rounded mr-3"
                        />
                        <span className="text-sm text-gray-700">Include tax in displayed prices</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tax ID Number (EIN/SSN)
                      </label>
                      <input
                        type="text"
                        value={shopData.tax.taxIdNumber}
                        onChange={(e) => setShopData({
                          ...shopData,
                          tax: {...shopData.tax, taxIdNumber: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business License Number
                      </label>
                      <input
                        type="text"
                        value={shopData.tax.businessLicenseNumber}
                        onChange={(e) => setShopData({
                          ...shopData,
                          tax: {...shopData.tax, businessLicenseNumber: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Provider
                      </label>
                      <input
                        type="text"
                        value={shopData.tax.insuranceProvider}
                        onChange={(e) => setShopData({
                          ...shopData,
                          tax: {...shopData.tax, insuranceProvider: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Insurance Policy Number
                      </label>
                      <input
                        type="text"
                        value={shopData.tax.insurancePolicyNumber}
                        onChange={(e) => setShopData({
                          ...shopData,
                          tax: {...shopData.tax, insurancePolicyNumber: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    ⚠️ Important: Ensure all tax and compliance information is accurate and up-to-date. Consult with a tax professional if needed.
                  </p>
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