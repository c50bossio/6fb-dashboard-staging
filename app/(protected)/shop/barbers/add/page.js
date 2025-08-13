'use client'

import { useState } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  UserPlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function AddBarber() {
  const { user } = useAuth()
  const supabase = createClient()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1) // 1: Basic Info, 2: Financial, 3: Schedule, 4: Review
  const [barberData, setBarberData] = useState({
    // Basic Information
    email: '',
    fullName: '',
    phone: '',
    bio: '',
    specialty: '',
    yearsExperience: 0,
    
    // Financial Arrangement
    financialModel: 'commission', // 'commission' or 'booth_rent'
    commissionRate: 60, // Barber gets 60%
    boothRentAmount: 0,
    productCommission: 20,
    
    // Schedule & Availability
    defaultSchedule: {
      monday: { enabled: true, start: '09:00', end: '18:00' },
      tuesday: { enabled: true, start: '09:00', end: '18:00' },
      wednesday: { enabled: true, start: '09:00', end: '18:00' },
      thursday: { enabled: true, start: '09:00', end: '18:00' },
      friday: { enabled: true, start: '09:00', end: '19:00' },
      saturday: { enabled: true, start: '10:00', end: '17:00' },
      sunday: { enabled: false, start: '00:00', end: '00:00' }
    },
    
    // Permissions
    canManageOwnSchedule: true,
    canViewOwnReports: true,
    canManageOwnClients: true,
    canSellProducts: true,
    
    // Customization
    enableCustomPage: true,
    customPageSlug: '',
    profilePhotoUrl: ''
  })

  const handleSubmit = async () => {
    setLoading(true)
    
    try {
      // First, create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: barberData.email,
        password: generateTempPassword(), // Generate temporary password
        options: {
          data: {
            full_name: barberData.fullName,
            role: 'BARBER'
          }
        }
      })
      
      if (authError) {
        console.error('Error creating barber account:', authError)
        alert('Failed to create barber account. They may already have an account.')
        setLoading(false)
        return
      }
      
      // Get the shop ID
      const { data: shop } = await supabase
        .from('barbershops')
        .select('id')
        .eq('owner_id', user?.id)
        .single()
      
      if (!shop) {
        alert('No barbershop found for this owner')
        setLoading(false)
        return
      }
      
      // Add barber to barbershop_staff
      const { error: staffError } = await supabase
        .from('barbershop_staff')
        .insert({
          barbershop_id: shop.id,
          user_id: authData.user?.id,
          role: 'BARBER',
          is_active: true,
          commission_rate: barberData.commissionRate,
          booth_rent_amount: barberData.boothRentAmount,
          financial_model: barberData.financialModel,
          can_manage_schedule: barberData.canManageOwnSchedule,
          can_view_reports: barberData.canViewOwnReports,
          can_manage_clients: barberData.canManageOwnClients,
          can_sell_products: barberData.canSellProducts
        })
      
      if (staffError) {
        console.error('Error adding barber to staff:', staffError)
        alert('Failed to add barber to staff')
        setLoading(false)
        return
      }
      
      // Create barber customization
      const { error: customError } = await supabase
        .from('barber_customizations')
        .insert({
          barbershop_id: shop.id,
          barber_id: authData.user?.id,
          slug: barberData.customPageSlug || barberData.fullName.toLowerCase().replace(/\s+/g, '-'),
          display_name: barberData.fullName,
          bio: barberData.bio,
          specialty: barberData.specialty,
          years_experience: barberData.yearsExperience,
          profile_photo_url: barberData.profilePhotoUrl
        })
      
      if (customError) {
        console.error('Error creating barber customization:', customError)
      }
      
      // Set up default availability
      const availabilityPromises = Object.entries(barberData.defaultSchedule)
        .filter(([_, schedule]) => schedule.enabled)
        .map(([day, schedule], index) => {
          const dayMap = {
            'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4,
            'friday': 5, 'saturday': 6, 'sunday': 0
          }
          
          return supabase
            .from('barber_availability')
            .insert({
              barbershop_id: shop.id,
              barber_id: authData.user?.id,
              day_of_week: dayMap[day],
              start_time: schedule.start,
              end_time: schedule.end,
              is_available: true
            })
        })
      
      await Promise.all(availabilityPromises)
      
      // Send welcome email (mock)
      console.log('Sending welcome email to:', barberData.email)
      
      alert(`Barber ${barberData.fullName} added successfully! They will receive an email to set up their password.`)
      router.push('/shop/dashboard')
      
    } catch (error) {
      console.error('Error adding barber:', error)
      alert('An error occurred while adding the barber')
    } finally {
      setLoading(false)
    }
  }

  const generateTempPassword = () => {
    // Generate a secure temporary password
    return `Temp${Math.random().toString(36).substring(2, 10)}!`
  }

  const updateSchedule = (day, field, value) => {
    setBarberData(prev => ({
      ...prev,
      defaultSchedule: {
        ...prev.defaultSchedule,
        [day]: {
          ...prev.defaultSchedule[day],
          [field]: value
        }
      }
    }))
  }

  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!barberData.email || !barberData.fullName) {
        alert('Please fill in all required fields')
        return
      }
    }
    setStep(step + 1)
  }

  const prevStep = () => setStep(step - 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Add New Barber</h1>
              <p className="text-sm text-gray-600">Add a barber to your shop team</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Step Indicators */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-8 rounded-full ${
                      s === step ? 'bg-olive-600' : s < step ? 'bg-indigo-200' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Basic Information */}
          {step === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <UserIcon className="h-5 w-5 mr-2 text-olive-600" />
                Basic Information
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={barberData.fullName}
                      onChange={(e) => setBarberData({...barberData, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Enter barber's full name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={barberData.email}
                      onChange={(e) => setBarberData({...barberData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={barberData.phone}
                      onChange={(e) => setBarberData({...barberData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={barberData.yearsExperience}
                      onChange={(e) => setBarberData({...barberData, yearsExperience: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialty
                    </label>
                    <input
                      type="text"
                      value={barberData.specialty}
                      onChange={(e) => setBarberData({...barberData, specialty: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Fades, Beard Styling"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Page URL
                    </label>
                    <div className="flex items-center">
                      <span className="text-sm text-gray-500 mr-2">yourshop.com/</span>
                      <input
                        type="text"
                        value={barberData.customPageSlug}
                        onChange={(e) => setBarberData({...barberData, customPageSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="john-doe"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    value={barberData.bio}
                    onChange={(e) => setBarberData({...barberData, bio: e.target.value})}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Brief bio about the barber's experience and skills..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Financial Arrangement */}
          {step === 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 mr-2 text-olive-600" />
                Financial Arrangement
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Financial Model
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="commission"
                        checked={barberData.financialModel === 'commission'}
                        onChange={(e) => setBarberData({...barberData, financialModel: e.target.value})}
                        className="mt-1 h-4 w-4 text-olive-600"
                      />
                      <div className="ml-3">
                        <p className="font-medium">Commission Based</p>
                        <p className="text-sm text-gray-600">Barber receives a percentage of service revenue</p>
                      </div>
                    </label>
                    
                    <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        value="booth_rent"
                        checked={barberData.financialModel === 'booth_rent'}
                        onChange={(e) => setBarberData({...barberData, financialModel: e.target.value})}
                        className="mt-1 h-4 w-4 text-olive-600"
                      />
                      <div className="ml-3">
                        <p className="font-medium">Booth Rent</p>
                        <p className="text-sm text-gray-600">Barber pays fixed weekly/monthly rent</p>
                      </div>
                    </label>
                  </div>
                </div>
                
                {barberData.financialModel === 'commission' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Service Commission (% to Barber)
                      </label>
                      <input
                        type="number"
                        value={barberData.commissionRate}
                        onChange={(e) => setBarberData({...barberData, commissionRate: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Shop keeps {100 - barberData.commissionRate}%</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Product Commission (% to Barber)
                      </label>
                      <input
                        type="number"
                        value={barberData.productCommission}
                        onChange={(e) => setBarberData({...barberData, productCommission: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                )}
                
                {barberData.financialModel === 'booth_rent' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Booth Rent Amount ($)
                    </label>
                    <input
                      type="number"
                      value={barberData.boothRentAmount}
                      onChange={(e) => setBarberData({...barberData, boothRentAmount: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      min="0"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Schedule & Availability */}
          {step === 3 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-olive-600" />
                Default Schedule
              </h2>
              
              <p className="text-sm text-gray-600 mb-6">
                Set the default working hours. The barber can adjust these later.
              </p>
              
              <div className="space-y-4">
                {Object.entries(barberData.defaultSchedule).map(([day, schedule]) => (
                  <div key={day} className="flex items-center space-x-4 py-3 border-b">
                    <div className="w-32">
                      <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                    </div>
                    
                    <input
                      type="checkbox"
                      checked={schedule.enabled}
                      onChange={(e) => updateSchedule(day, 'enabled', e.target.checked)}
                      className="h-4 w-4 text-olive-600 rounded"
                    />
                    
                    {schedule.enabled && (
                      <>
                        <input
                          type="time"
                          value={schedule.start}
                          onChange={(e) => updateSchedule(day, 'start', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={schedule.end}
                          onChange={(e) => updateSchedule(day, 'end', e.target.value)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm"
                        />
                      </>
                    )}
                    
                    {!schedule.enabled && (
                      <span className="text-sm text-gray-500">Day off</span>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-4">Permissions</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={barberData.canManageOwnSchedule}
                      onChange={(e) => setBarberData({...barberData, canManageOwnSchedule: e.target.checked})}
                      className="h-4 w-4 text-olive-600 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Can manage own schedule</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={barberData.canViewOwnReports}
                      onChange={(e) => setBarberData({...barberData, canViewOwnReports: e.target.checked})}
                      className="h-4 w-4 text-olive-600 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Can view own reports</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={barberData.canManageOwnClients}
                      onChange={(e) => setBarberData({...barberData, canManageOwnClients: e.target.checked})}
                      className="h-4 w-4 text-olive-600 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Can manage own clients</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={barberData.canSellProducts}
                      onChange={(e) => setBarberData({...barberData, canSellProducts: e.target.checked})}
                      className="h-4 w-4 text-olive-600 rounded mr-3"
                    />
                    <span className="text-sm text-gray-700">Can sell products</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-olive-600" />
                Review & Confirm
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Basic Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm"><span className="font-medium">Name:</span> {barberData.fullName}</p>
                    <p className="text-sm"><span className="font-medium">Email:</span> {barberData.email}</p>
                    <p className="text-sm"><span className="font-medium">Phone:</span> {barberData.phone || 'Not provided'}</p>
                    <p className="text-sm"><span className="font-medium">Specialty:</span> {barberData.specialty || 'Not specified'}</p>
                    <p className="text-sm"><span className="font-medium">Experience:</span> {barberData.yearsExperience} years</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Financial Arrangement</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Model:</span> {barberData.financialModel === 'commission' ? 'Commission Based' : 'Booth Rent'}
                    </p>
                    {barberData.financialModel === 'commission' ? (
                      <>
                        <p className="text-sm"><span className="font-medium">Service Commission:</span> {barberData.commissionRate}% to barber</p>
                        <p className="text-sm"><span className="font-medium">Product Commission:</span> {barberData.productCommission}% to barber</p>
                      </>
                    ) : (
                      <p className="text-sm"><span className="font-medium">Weekly Rent:</span> ${barberData.boothRentAmount}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-md font-medium text-gray-900 mb-3">Working Days</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm">
                      {Object.entries(barberData.defaultSchedule)
                        .filter(([_, s]) => s.enabled)
                        .map(([day]) => day.charAt(0).toUpperCase() + day.slice(1))
                        .join(', ')}
                    </p>
                  </div>
                </div>
                
                <div className="p-4 bg-olive-50 rounded-lg">
                  <p className="text-sm text-olive-800">
                    <strong>Note:</strong> The barber will receive an email invitation to set up their password and access their dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={prevStep}
              disabled={step === 1}
              className={`px-4 py-2 rounded-lg ${
                step === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                Next Step
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding Barber...
                  </>
                ) : (
                  <>
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Add Barber
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}