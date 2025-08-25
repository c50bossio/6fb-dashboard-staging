'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { Card } from '../ui/card'
import Button from '../ui/Button'
import { 
  CurrencyDollarIcon,
  UserGroupIcon,
  CalculatorIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  HomeIcon,
  ScaleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function CompensationConfiguration() {
  const { user, profile } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [barbershopId, setBarbershopId] = useState(null)
  const [paymentConfig, setPaymentConfig] = useState(null)
  const [staff, setStaff] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [activeModel, setActiveModel] = useState('commission')
  
  // Financial arrangement state
  const [arrangement, setArrangement] = useState({
    arrangement_type: 'commission',
    commission_percentage: 0.40, // 60/40 split (barber gets 40%)
    booth_rent_amount: 1500,
    hybrid_base_rent: 800,
    hybrid_commission_rate: 0.20,
    hybrid_revenue_threshold: 3000,
    billing_cycle: 'monthly',
    due_date_day: 1,
    payment_method_priority: ['balance', 'ach', 'card']
  })

  // Load configuration and staff
  useEffect(() => {
    if (user && profile) {
      loadConfiguration()
    }
  }, [user, profile])

  const loadConfiguration = async () => {
    try {
      setLoading(true)
      
      // Get barbershop ID
      const shopId = profile?.shop_id || profile?.barbershop_id
      if (!shopId) {
        toast.error('No barbershop found')
        return
      }
      setBarbershopId(shopId)

      // Load payment configuration
      const { data: config } = await supabase
        .from('payment_configurations')
        .select('*')
        .eq('barbershop_id', shopId)
        .single()
      
      if (config) {
        setPaymentConfig(config)
        setActiveModel(config.default_compensation_model || 'commission')
      }

      // Load staff members
      const { data: staffData } = await supabase
        .from('barbershop_staff')
        .select('*')
        .eq('barbershop_id', shopId)
        .eq('is_active', true)

      if (staffData) {
        // Get financial arrangements for each staff member
        const staffWithArrangements = await Promise.all(
          staffData.map(async (member) => {
            const { data: arrangement } = await supabase
              .from('financial_arrangements')
              .select('*')
              .eq('barbershop_id', shopId)
              .eq('barber_id', member.user_id)
              .single()
            
            return { ...member, arrangement }
          })
        )
        setStaff(staffWithArrangements)
      }
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast.error('Failed to load compensation settings')
    } finally {
      setLoading(false)
    }
  }

  const saveArrangement = async () => {
    if (!selectedStaff) {
      toast.error('Please select a staff member')
      return
    }

    setSaving(true)
    try {
      // Save or update financial arrangement
      const { error } = await supabase
        .from('financial_arrangements')
        .upsert({
          barbershop_id: barbershopId,
          barber_id: selectedStaff.user_id,
          ...arrangement,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success('Compensation settings saved successfully')
      await loadConfiguration() // Reload to show updated data
    } catch (error) {
      console.error('Error saving arrangement:', error)
      toast.error('Failed to save compensation settings')
    } finally {
      setSaving(false)
    }
  }

  // Calculate earnings based on model
  const calculateEarnings = (revenue) => {
    const amount = parseFloat(revenue) || 0
    
    switch (arrangement.arrangement_type) {
      case 'commission':
        return {
          barberEarns: amount * (1 - arrangement.commission_percentage),
          shopEarns: amount * arrangement.commission_percentage,
          description: `Barber keeps ${((1 - arrangement.commission_percentage) * 100).toFixed(0)}%, shop gets ${(arrangement.commission_percentage * 100).toFixed(0)}%`
        }
      
      case 'booth_rent':
        return {
          barberEarns: amount,
          shopEarns: 0,
          monthlyRent: arrangement.booth_rent_amount,
          description: `Barber keeps 100% of revenue, pays $${arrangement.booth_rent_amount}/month rent`
        }
      
      case 'hybrid':
        if (amount <= arrangement.hybrid_revenue_threshold) {
          return {
            barberEarns: amount,
            shopEarns: 0,
            monthlyRent: arrangement.hybrid_base_rent,
            description: `Below $${arrangement.hybrid_revenue_threshold} threshold - barber keeps 100%, pays $${arrangement.hybrid_base_rent}/month`
          }
        } else {
          const excess = amount - arrangement.hybrid_revenue_threshold
          const commission = excess * arrangement.hybrid_commission_rate
          return {
            barberEarns: amount - commission,
            shopEarns: commission,
            monthlyRent: arrangement.hybrid_base_rent,
            description: `Above threshold - ${(arrangement.hybrid_commission_rate * 100).toFixed(0)}% on revenue over $${arrangement.hybrid_revenue_threshold}, plus $${arrangement.hybrid_base_rent}/month`
          }
        }
      
      default:
        return { barberEarns: 0, shopEarns: 0, description: '' }
    }
  }

  // Model selection cards
  const ModelCard = ({ type, title, description, icon: Icon, selected, onClick }) => (
    <Card 
      className={`p-6 cursor-pointer transition-all ${
        selected ? 'ring-2 ring-brand-500 bg-brand-50' : 'hover:shadow-lg'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon className={`h-8 w-8 ${selected ? 'text-brand-600' : 'text-gray-400'}`} />
        {selected && <CheckCircleIcon className="h-6 w-6 text-brand-600" />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </Card>
  )

  // Revenue calculator
  const RevenueCalculator = () => {
    const [testRevenue, setTestRevenue] = useState(5000)
    const earnings = calculateEarnings(testRevenue)

    return (
      <Card className="p-6 bg-gray-50">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          <CalculatorIcon className="h-5 w-5 inline mr-2" />
          Revenue Calculator
        </h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Revenue
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={testRevenue}
                onChange={(e) => setTestRevenue(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Barber Earnings</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(earnings.barberEarns)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Shop Revenue</p>
              <p className="text-2xl font-bold text-brand-600">
                {formatCurrency(earnings.shopEarns)}
              </p>
            </div>
          </div>

          {earnings.monthlyRent && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
                Monthly Rent Due: <span className="font-semibold">{formatCurrency(earnings.monthlyRent)}</span>
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <InformationCircleIcon className="h-4 w-4 inline mr-1" />
              {earnings.description}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Compensation</h2>
        <p className="text-gray-600">
          Configure how your barbers are compensated - commission, booth rent, or hybrid model
        </p>
      </div>

      {/* Model Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Compensation Model</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ModelCard
            type="commission"
            title="Commission Split"
            description="Barbers earn a percentage of each service (typically 60/40 or 70/30)"
            icon={ScaleIcon}
            selected={arrangement.arrangement_type === 'commission'}
            onClick={() => setArrangement({...arrangement, arrangement_type: 'commission'})}
          />
          <ModelCard
            type="booth_rent"
            title="Booth Rent"
            description="Barbers pay fixed monthly rent and keep 100% of earnings"
            icon={HomeIcon}
            selected={arrangement.arrangement_type === 'booth_rent'}
            onClick={() => setArrangement({...arrangement, arrangement_type: 'booth_rent'})}
          />
          <ModelCard
            type="hybrid"
            title="Hybrid Model"
            description="Lower rent plus commission on revenue above threshold"
            icon={SparklesIcon}
            selected={arrangement.arrangement_type === 'hybrid'}
            onClick={() => setArrangement({...arrangement, arrangement_type: 'hybrid'})}
          />
        </div>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configure {arrangement.arrangement_type === 'commission' ? 'Commission' :
                       arrangement.arrangement_type === 'booth_rent' ? 'Booth Rent' : 'Hybrid'} Model
            </h3>

            {arrangement.arrangement_type === 'commission' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Commission Rate
                  </label>
                  <select
                    value={arrangement.commission_percentage}
                    onChange={(e) => setArrangement({...arrangement, commission_percentage: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="0.30">30% (Barber keeps 70%)</option>
                    <option value="0.40">40% (Barber keeps 60%)</option>
                    <option value="0.50">50% (Barber keeps 50%)</option>
                  </select>
                </div>
              </div>
            )}

            {arrangement.arrangement_type === 'booth_rent' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={arrangement.booth_rent_amount}
                      onChange={(e) => setArrangement({...arrangement, booth_rent_amount: parseFloat(e.target.value)})}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date (Day of Month)
                  </label>
                  <select
                    value={arrangement.due_date_day}
                    onChange={(e) => setArrangement({...arrangement, due_date_day: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="1">1st of each month</option>
                    <option value="15">15th of each month</option>
                    <option value="28">28th of each month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Collection Priority
                  </label>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>1. Account Balance</span>
                      <span className="text-green-600 font-semibold">$0 fee</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>2. Bank Transfer (ACH)</span>
                      <span className="text-blue-600 font-semibold">$0.80 fee</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span>3. Card on File</span>
                      <span className="text-orange-600 font-semibold">2.9% + $0.30</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {arrangement.arrangement_type === 'hybrid' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Monthly Rent
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={arrangement.hybrid_base_rent}
                      onChange={(e) => setArrangement({...arrangement, hybrid_base_rent: parseFloat(e.target.value)})}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Threshold
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={arrangement.hybrid_revenue_threshold}
                      onChange={(e) => setArrangement({...arrangement, hybrid_revenue_threshold: parseFloat(e.target.value)})}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Commission applies only to revenue above this amount</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Commission Rate (Above Threshold)
                  </label>
                  <select
                    value={arrangement.hybrid_commission_rate}
                    onChange={(e) => setArrangement({...arrangement, hybrid_commission_rate: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="0.10">10%</option>
                    <option value="0.15">15%</option>
                    <option value="0.20">20%</option>
                    <option value="0.25">25%</option>
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* Staff Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              <UserGroupIcon className="h-5 w-5 inline mr-2" />
              Apply to Staff Member
            </h3>
            
            {staff.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No staff members found. Add staff members first.
              </p>
            ) : (
              <div className="space-y-2">
                {staff.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => setSelectedStaff(member)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedStaff?.id === member.id
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.full_name || member.email || 'Unnamed Staff'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.arrangement?.arrangement_type ? 
                            `Current: ${member.arrangement.arrangement_type}` : 
                            'No arrangement set'}
                        </p>
                      </div>
                      {selectedStaff?.id === member.id && (
                        <CheckCircleIcon className="h-5 w-5 text-brand-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Calculator & Summary */}
        <div className="space-y-6">
          <RevenueCalculator />

          {/* Save Button */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  <InformationCircleIcon className="h-4 w-4 inline mr-1" />
                  Changes will apply to future transactions only. Existing transactions remain unchanged.
                </p>
              </div>

              <Button
                onClick={saveArrangement}
                disabled={!selectedStaff || saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Compensation Settings'}
              </Button>
            </div>
          </Card>

          {/* Tax Notice */}
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              Tax Compliance (1099s)
            </h4>
            <p className="text-sm text-blue-800">
              Stripe automatically handles 1099 generation for barbers earning over $600/year. 
              Forms are sent directly to barbers and the IRS in January.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}