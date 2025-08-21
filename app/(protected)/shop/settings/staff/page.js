'use client'

import { 
  UserGroupIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  getPermissionTemplates, 
  applyPermissionTemplate, 
  canManagePermissions,
  getPermissionLevel 
} from '@/lib/permissions'
import { createClient } from '@/lib/supabase/client'

export default function StaffPermissions() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [editingPermissions, setEditingPermissions] = useState(false)
  const [barbershopId, setBarbershopId] = useState(null)
  const [canManage, setCanManage] = useState(false)
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [newStaffData, setNewStaffData] = useState({
    email: '',
    name: '',
    role: 'BARBER',
    commission_rate: 0.5,
    financial_model: 'commission'
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadStaffData()
  }, [user])

  const loadStaffData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const supabase = createClient()

      const shopId = await getUserBarbershop()
      setBarbershopId(shopId)

      const canManagePerms = await canManagePermissions(user.id, shopId)
      setCanManage(canManagePerms)

      if (!canManagePerms) {
        setLoading(false)
        return
      }

      // Load staff from FastAPI backend
      const staffResponse = await fetch('/api/shop/staff')
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        setStaff(staffData || [])
      } else {
        console.error('Error loading staff from FastAPI')
        
        // Fallback to direct Supabase query
        const { data: staffData, error: staffError } = await supabase
          .from('barbershop_staff')
          .select(`
            *,
            user:users(*),
            permissions:barber_permissions(*)
          `)
          .eq('barbershop_id', shopId)
          .eq('is_active', true)

        if (staffError) {
          console.error('Error loading staff:', staffError)
        } else {
          setStaff(staffData || [])
        }
      }

      const templatesData = await getPermissionTemplates(true) // System templates only
      setTemplates(templatesData)

    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUserBarbershop = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const { profile } = await response.json()
        if (profile?.shop_id) {
          return profile.shop_id
        }
      }
      
      // Fallback: check if user owns any barbershops
      const shopResponse = await fetch('/api/barbershops/user-shops')
      if (shopResponse.ok) {
        const { shops } = await shopResponse.json()
        if (shops && shops.length > 0) {
          return shops[0].id
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting user barbershop:', error)
      return null
    }
  }

  const handleApplyTemplate = async (barberId, templateId) => {
    try {
      const result = await applyPermissionTemplate(barberId, barbershopId, templateId, user.id)
      
      if (result.success) {
        await loadStaffData()
        console.log('Template applied successfully')
      } else {
        console.error('Failed to apply template:', result.error)
      }
    } catch (error) {
      console.error('Error applying template:', error)
    }
  }

  const handleAddStaff = async (staffData) => {
    try {
      const response = await fetch('/api/shop/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffData)
      })

      if (response.ok) {
        await loadStaffData()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error adding staff:', error)
      return { success: false, error: error.message }
    }
  }

  const handleUpdateStaff = async (staffId, staffData) => {
    try {
      const response = await fetch(`/api/shop/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(staffData)
      })

      if (response.ok) {
        await loadStaffData()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error updating staff:', error)
      return { success: false, error: error.message }
    }
  }

  const handleRemoveStaff = async (staffId) => {
    try {
      const response = await fetch(`/api/shop/staff/${staffId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadStaffData()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.error }
      }
    } catch (error) {
      console.error('Error removing staff:', error)
      return { success: false, error: error.message }
    }
  }

  const getStaffPermissionSummary = (staffMember) => {
    const permissions = staffMember.permissions?.[0]
    if (!permissions || !permissions.is_active) {
      return { level: 'none', capabilities: 0, color: 'gray' }
    }

    const level = getPermissionLevel(permissions)
    const capabilities = Object.values(permissions).filter(value => value === true).length
    
    return { ...level, capabilities }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Access Denied</h3>
              <p className="text-red-700">You don't have permission to manage staff permissions.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
              <UserGroupIcon className="h-8 w-8 text-olive-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Staff Permissions</h1>
              <p className="text-gray-600">Manage barber access and service permissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Templates Overview */}
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Permission Templates</h2>
          <p className="text-gray-600">Quick setup options for common barber roles</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    template.template_level === 'basic' ? 'bg-olive-100 text-olive-800' :
                    template.template_level === 'intermediate' ? 'bg-moss-100 text-moss-900' :
                    template.template_level === 'advanced' ? 'bg-gold-100 text-gold-800' :
                    'bg-indigo-100 text-indigo-800'
                  }`}>
                    {template.template_level}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                <div className="space-y-1 text-xs">
                  {template.can_modify_services && (
                    <div className="flex items-center text-green-600">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Service Management
                    </div>
                  )}
                  {template.can_set_pricing && (
                    <div className="flex items-center text-green-600">
                      <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                      Pricing ({template.pricing_variance_percent}% variance)
                    </div>
                  )}
                  {template.can_set_availability && (
                    <div className="flex items-center text-green-600">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Schedule Control
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Staff Members */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Staff Members</h2>
              <p className="text-gray-600">Manage individual barber permissions</p>
            </div>
            <button 
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Invite Staff
            </button>
          </div>
        </div>

        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Staff Members</h3>
            <p className="text-gray-600 mb-4">Start by inviting barbers to join your shop</p>
            <button 
              onClick={() => setShowAddStaffModal(true)}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              Invite Your First Barber
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {staff.map((staffMember) => {
              const permissionSummary = getStaffPermissionSummary(staffMember)
              return (
                <div key={staffMember.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-12 w-12 rounded-full bg-gray-300 flex items-center justify-center">
                        <UserGroupIcon className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {staffMember.user?.name || staffMember.user?.email}
                        </h3>
                        <p className="text-gray-600">{staffMember.role || 'Barber'}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            permissionSummary.level === 'none' ? 'bg-gray-100 text-gray-800' :
                            permissionSummary.color === 'blue' ? 'bg-olive-100 text-olive-800' :
                            permissionSummary.color === 'green' ? 'bg-moss-100 text-moss-900' :
                            permissionSummary.color === 'purple' ? 'bg-gold-100 text-gold-800' :
                            'bg-indigo-100 text-indigo-800'
                          }`}>
                            {permissionSummary.description}
                          </span>
                          <span className="text-xs text-gray-500">
                            {permissionSummary.capabilities} permissions active
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* Quick Template Actions */}
                      <div className="flex space-x-1">
                        {templates.slice(0, 3).map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleApplyTemplate(staffMember.user.id, template.id)}
                            className={`px-3 py-1 text-xs rounded-md border transition-colors ${
                              template.template_level === 'basic' ? 'border-olive-200 text-olive-700 hover:bg-olive-50' :
                              template.template_level === 'intermediate' ? 'border-green-200 text-green-700 hover:bg-green-50' :
                              'border-gold-200 text-gold-700 hover:bg-gold-50'
                            }`}
                            title={`Apply ${template.name} template`}
                          >
                            {template.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      {/* Edit Button */}
                      <button 
                        onClick={() => {
                          setSelectedStaff(staffMember)
                          setEditingPermissions(true)
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Cog6ToothIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Permission Summary */}
                  {staffMember.permissions?.[0]?.is_active && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <ScissorsIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Services:</span>
                        <span className={staffMember.permissions[0].can_modify_services ? 'text-green-600' : 'text-gray-400'}>
                          {staffMember.permissions[0].can_modify_services ? 'Can modify' : 'View only'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Pricing:</span>
                        <span className={staffMember.permissions[0].can_set_pricing ? 'text-green-600' : 'text-gray-400'}>
                          {staffMember.permissions[0].can_set_pricing 
                            ? `±${staffMember.permissions[0].pricing_variance_percent}%`
                            : 'Restricted'
                          }
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">Schedule:</span>
                        <span className={staffMember.permissions[0].can_set_availability ? 'text-green-600' : 'text-gray-400'}>
                          {staffMember.permissions[0].can_set_availability ? 'Full control' : 'Basic only'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-olive-50 rounded-lg p-6">
        <div className="flex items-start">
          <InformationCircleIcon className="h-6 w-6 text-olive-600 mt-1 mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-olive-900 mb-2">Permission Management Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-olive-800">
              <div>
                <h4 className="font-medium mb-2">Start with Templates</h4>
                <p>Use pre-defined templates for quick setup, then customize as needed for individual barbers.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Regular Reviews</h4>
                <p>Review permissions quarterly and adjust based on barber experience and performance.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Gradual Expansion</h4>
                <p>Start new barbers with basic permissions and expand access as they gain experience.</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Audit Trail</h4>
                <p>All permission changes are logged for accountability and compliance.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Invite Staff Member</h3>
              <button 
                onClick={() => setShowAddStaffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {message.text && (
              <div className={`mb-4 p-3 rounded-lg ${
                message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={newStaffData.email}
                  onChange={(e) => setNewStaffData({...newStaffData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="barber@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newStaffData.name}
                  onChange={(e) => setNewStaffData({...newStaffData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newStaffData.role}
                  onChange={(e) => setNewStaffData({...newStaffData, role: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                >
                  <option value="BARBER">Barber</option>
                  <option value="MANAGER">Manager</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="APPRENTICE">Apprentice</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={newStaffData.commission_rate * 100}
                  onChange={(e) => setNewStaffData({...newStaffData, commission_rate: e.target.value / 100})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSaving(true)
                  setMessage({ type: '', text: '' })
                  
                  const result = await handleAddStaff(newStaffData)
                  
                  if (result.success) {
                    setMessage({ type: 'success', text: 'Staff member invited successfully!' })
                    setNewStaffData({ email: '', name: '', role: 'BARBER', commission_rate: 0.5, financial_model: 'commission' })
                    setTimeout(() => {
                      setShowAddStaffModal(false)
                      setMessage({ type: '', text: '' })
                    }, 2000)
                  } else {
                    setMessage({ type: 'error', text: result.error || 'Failed to invite staff member' })
                  }
                  
                  setSaving(false)
                }}
                disabled={saving || !newStaffData.email || !newStaffData.name}
                className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:bg-gray-400 flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Inviting...
                  </>
                ) : (
                  'Send Invitation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}