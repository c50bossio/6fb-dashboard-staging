'use client'

import { 
  BuildingOffice2Icon,
  GlobeAltIcon,
  UserGroupIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  DocumentCheckIcon,
  BarsArrowUpIcon,
  BarsArrowDownIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import { templateEngine, PREMIUM_TEMPLATES } from '@/lib/templates/template-engine'

const LocationCard = ({ location, onSelect, isSelected, template, lastUpdate }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div 
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : 'border-gray-200 hover:border-gray-300 bg-white hover:shadow-sm'
      }`}
      onClick={() => onSelect(location.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <BuildingOffice2Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{location.name}</h3>
            <p className="text-sm text-gray-600">{location.address}</p>
          </div>
        </div>
        
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          getStatusColor(location.status)
        }`}>
          {location.status || 'active'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Template:</span>
          <div className="font-medium text-gray-900">
            {template?.name || 'Custom'}
          </div>
        </div>
        <div>
          <span className="text-gray-500">Staff:</span>
          <div className="font-medium text-gray-900">
            {location.staff_count || 0} barbers
          </div>
        </div>
      </div>

      {lastUpdate && (
        <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
          Last updated: {formatDate(lastUpdate)}
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircleIcon className="w-5 h-5 text-blue-600" />
        </div>
      )}
    </div>
  )
}

const BulkActionModal = ({ isOpen, onClose, action, selectedLocations, onConfirm }) => {
  const [formData, setFormData] = useState({})
  const [processing, setProcessing] = useState(false)

  const getActionTitle = () => {
    switch (action?.type) {
      case 'apply_template': return 'Apply Template to Locations'
      case 'update_settings': return 'Update Settings for Locations'
      case 'update_branding': return 'Update Branding for Locations'
      case 'export_settings': return 'Export Settings from Locations'
      case 'backup_data': return 'Backup Location Data'
      default: return 'Bulk Action'
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setProcessing(true)
    try {
      await onConfirm({ ...action, data: formData })
      onClose()
    } catch (error) {
      console.error('Error executing bulk action:', error)
    } finally {
      setProcessing(false)
    }
  }

  if (!isOpen || !action) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getActionTitle()}</h2>
              <p className="text-sm text-gray-600 mt-1">
                This action will affect {selectedLocations.length} location{selectedLocations.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
            {/* Selected Locations Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Locations:</h3>
              <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-3">
                <div className="space-y-1">
                  {selectedLocations.map(location => (
                    <div key={location.id} className="flex items-center space-x-2 text-sm">
                      <BuildingOffice2Icon className="w-4 h-4 text-gray-400" />
                      <span>{location.name}</span>
                      <span className="text-gray-500">({location.address})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action-specific forms */}
            {action.type === 'apply_template' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template
                  </label>
                  <select
                    required
                    value={formData.templateId || ''}
                    onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a template...</option>
                    {Object.values(PREMIUM_TEMPLATES).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="preserveCustomizations"
                    checked={formData.preserveCustomizations || false}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      preserveCustomizations: e.target.checked 
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="preserveCustomizations" className="text-sm text-gray-700">
                    Preserve existing customizations where possible
                  </label>
                </div>
              </div>
            )}

            {action.type === 'update_settings' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Settings Category
                  </label>
                  <select
                    required
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select category...</option>
                    <option value="business_hours">Business Hours</option>
                    <option value="contact_info">Contact Information</option>
                    <option value="booking_settings">Booking Settings</option>
                    <option value="payment_settings">Payment Settings</option>
                    <option value="notification_settings">Notification Settings</option>
                  </select>
                </div>
                
                {formData.category && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Settings JSON
                    </label>
                    <textarea
                      required
                      value={formData.settings || ''}
                      onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                      placeholder='{ "key": "value" }'
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter JSON settings that will be applied to all selected locations
                    </p>
                  </div>
                )}
              </div>
            )}

            {action.type === 'update_branding' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Assets
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-sm font-medium text-blue-600 hover:text-blue-500"
                      >
                        Upload logo and brand assets
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Supported: PNG, JPG, SVG up to 10MB
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={formData.primaryColor || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Color
                    </label>
                    <input
                      type="color"
                      value={formData.secondaryColor || '#6B7280'}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-full h-10 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Warning for destructive actions */}
            {['update_settings', 'apply_template'].includes(action.type) && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This action will modify settings across multiple locations simultaneously. 
                      Consider creating a backup before proceeding.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 bg-gray-50 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {processing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Execute Action</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const BulkOperationProgress = ({ operation, onClose }) => {
  if (!operation || operation.status === 'completed') return null

  const getStatusIcon = () => {
    switch (operation.status) {
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'error':
        return <XMarkIcon className="w-5 h-5 text-red-600" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-xl border border-gray-200 shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">Bulk Operation</h4>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center space-x-3 mb-3">
        {getStatusIcon()}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 capitalize">
            {operation.type?.replace('_', ' ') || 'Processing'}
          </p>
          <p className="text-xs text-gray-500">
            {operation.completed || 0} of {operation.total || 0} locations
          </p>
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
        <div 
          className={`h-2 rounded-full ${
            operation.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ 
            width: `${operation.total > 0 ? (operation.completed / operation.total) * 100 : 0}%` 
          }}
        ></div>
      </div>
      
      {operation.currentLocation && (
        <p className="text-xs text-gray-600">
          Processing: {operation.currentLocation}
        </p>
      )}
      
      {operation.status === 'error' && operation.error && (
        <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700">
          Error: {operation.error}
        </div>
      )}
    </div>
  )
}

const BulkActionsToolbar = ({ selectedLocations, onAction, onSelectAll, onDeselectAll, totalLocations }) => {
  const actions = [
    {
      id: 'apply_template',
      label: 'Apply Template',
      icon: DocumentDuplicateIcon,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      id: 'update_settings',
      label: 'Update Settings',
      icon: Cog6ToothIcon,
      color: 'bg-green-600 hover:bg-green-700'
    },
    {
      id: 'update_branding',
      label: 'Update Branding',
      icon: PencilSquareIcon,
      color: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      id: 'export_settings',
      label: 'Export Data',
      icon: ArrowDownTrayIcon,
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      id: 'backup_data',
      label: 'Create Backup',
      icon: DocumentCheckIcon,
      color: 'bg-orange-600 hover:bg-orange-700'
    }
  ]

  return (
    <div className={`sticky top-0 bg-white border-b border-gray-200 p-4 transition-all duration-300 ${
      selectedLocations.length > 0 ? 'shadow-sm' : ''
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedLocations.length === totalLocations && totalLocations > 0}
              onChange={(e) => e.target.checked ? onSelectAll() : onDeselectAll()}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              {selectedLocations.length > 0 
                ? `${selectedLocations.length} location${selectedLocations.length !== 1 ? 's' : ''} selected`
                : 'Select locations'
              }
            </span>
          </div>
          
          {selectedLocations.length > 0 && (
            <div className="flex items-center space-x-1">
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 hover:bg-blue-50 rounded"
              >
                Select All
              </button>
              <button
                onClick={onDeselectAll}
                className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 hover:bg-gray-50 rounded"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
        
        {selectedLocations.length > 0 && (
          <div className="flex items-center space-x-2">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => onAction({ type: action.id })}
                className={`inline-flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  action.color
                }`}
              >
                <action.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{action.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function EnterpriseBulkOperations() {
  const { user } = useAuth()
  const [locations, setLocations] = useState([])
  const [selectedLocations, setSelectedLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [showActionModal, setShowActionModal] = useState(false)
  const [currentAction, setCurrentAction] = useState(null)
  const [operation, setOperation] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [filterStatus, setFilterStatus] = useState('all')

  const supabase = createClient()

  // Load user's locations
  useEffect(() => {
    if (user) {
      loadLocations()
    }
  }, [user])

  const loadLocations = async () => {
    try {
      setLoading(true)
      
      // Get user's organization and locations
      const { data: orgMembership } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single()

      if (!orgMembership) {
        setMessage({ type: 'info', text: 'You need enterprise access to manage multiple locations.' })
        setLocations([])
        return
      }

      const { data: locationData, error } = await supabase
        .from('barbershops')
        .select(`
          id,
          name,
          address,
          city,
          state,
          phone,
          email,
          status,
          created_at,
          updated_at,
          staff_count:barbershop_staff(count)
        `)
        .eq('organization_id', orgMembership.organization_id)

      if (error) throw error

      setLocations(locationData || [])
    } catch (error) {
      console.error('Error loading locations:', error)
      setMessage({ type: 'error', text: 'Error loading locations.' })
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort locations
  const filteredLocations = locations
    .filter(location => {
      const matchesSearch = !searchTerm || 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesFilter = filterStatus === 'all' || location.status === filterStatus
      
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return (a.status || '').localeCompare(b.status || '')
        case 'updated':
          return new Date(b.updated_at) - new Date(a.updated_at)
        default:
          return 0
      }
    })

  const handleLocationSelect = (locationId) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
  }

  const handleSelectAll = () => {
    setSelectedLocations(filteredLocations.map(loc => loc.id))
  }

  const handleDeselectAll = () => {
    setSelectedLocations([])
  }

  const handleAction = (action) => {
    setCurrentAction(action)
    setShowActionModal(true)
  }

  const executeBulkAction = async (actionData) => {
    try {
      const selectedLocationObjects = locations.filter(loc => 
        selectedLocations.includes(loc.id)
      )
      
      setOperation({
        type: actionData.type,
        status: 'running',
        total: selectedLocationObjects.length,
        completed: 0,
        currentLocation: null
      })
      
      // Simulate bulk operation progress
      for (let i = 0; i < selectedLocationObjects.length; i++) {
        const location = selectedLocationObjects[i]
        
        setOperation(prev => ({
          ...prev,
          completed: i,
          currentLocation: location.name
        }))
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Execute actual action based on type
        switch (actionData.type) {
          case 'apply_template':
            await applyTemplateToLocation(location.id, actionData.data.templateId, {
              preserveCustomizations: actionData.data.preserveCustomizations
            })
            break
          case 'update_settings':
            await updateLocationSettings(location.id, actionData.data.category, 
              JSON.parse(actionData.data.settings))
            break
          case 'update_branding':
            await updateLocationBranding(location.id, actionData.data)
            break
          case 'export_settings':
            // Handle export
            break
          case 'backup_data':
            // Handle backup
            break
          default:
            console.warn('Unknown action type:', actionData.type)
        }
      }
      
      setOperation(prev => ({
        ...prev,
        status: 'completed',
        completed: selectedLocationObjects.length,
        currentLocation: null
      }))
      
      setMessage({ 
        type: 'success', 
        text: `Successfully executed ${actionData.type.replace('_', ' ')} on ${selectedLocationObjects.length} location${selectedLocationObjects.length !== 1 ? 's' : ''}.` 
      })
      
      // Clear selection
      setSelectedLocations([])
      
      // Reload locations to reflect changes
      await loadLocations()
      
    } catch (error) {
      console.error('Error executing bulk action:', error)
      setOperation(prev => ({
        ...prev,
        status: 'error',
        error: error.message
      }))
      setMessage({ type: 'error', text: `Error executing bulk action: ${error.message}` })
    }
  }

  const applyTemplateToLocation = async (locationId, templateId, options = {}) => {
    try {
      const result = await templateEngine.applyTemplate(user.id, templateId, {
        locationId,
        ...options
      })
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to apply template')
      }
      
      // Update location's template reference
      await supabase
        .from('barbershops')
        .update({ template_id: templateId, updated_at: new Date().toISOString() })
        .eq('id', locationId)
        
    } catch (error) {
      console.error('Error applying template to location:', error)
      throw error
    }
  }

  const updateLocationSettings = async (locationId, category, settings) => {
    try {
      // Update settings in the settings_hierarchy table
      await supabase
        .from('settings_hierarchy')
        .upsert({
          context_type: 'location',
          context_id: locationId,
          category,
          settings,
          updated_at: new Date().toISOString()
        })
      
      // Update location timestamp
      await supabase
        .from('barbershops')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', locationId)
        
    } catch (error) {
      console.error('Error updating location settings:', error)
      throw error
    }
  }

  const updateLocationBranding = async (locationId, brandingData) => {
    try {
      // Update branding settings
      const brandingSettings = {
        primaryColor: brandingData.primaryColor,
        secondaryColor: brandingData.secondaryColor,
        // Add logo upload handling here
      }
      
      await supabase
        .from('settings_hierarchy')
        .upsert({
          context_type: 'location',
          context_id: locationId,
          category: 'branding',
          settings: brandingSettings,
          updated_at: new Date().toISOString()
        })
        
    } catch (error) {
      console.error('Error updating location branding:', error)
      throw error
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enterprise Bulk Operations</h2>
          <p className="text-gray-600 mt-1">
            Manage customization settings across multiple locations efficiently
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </span>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            selectedLocations.length > 0 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-gray-100 text-gray-600'
          }`}>
            {selectedLocations.length} selected
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <span>{message.text}</span>
            <button
              onClick={() => setMessage({ type: '', text: '' })}
              className="ml-4 text-current hover:opacity-70"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedLocations={selectedLocations}
        totalLocations={filteredLocations.length}
        onAction={handleAction}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="updated">Sort by Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BuildingOffice2Icon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {locations.length === 0 ? 'No locations found' : 'No locations match your filters'}
          </h3>
          <p className="text-gray-600">
            {locations.length === 0 
              ? 'You need to be part of an enterprise organization to manage multiple locations.'
              : 'Try adjusting your search or filter criteria.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(location => {
            const template = Object.values(PREMIUM_TEMPLATES).find(t => 
              t.id === location.template_id
            )
            
            return (
              <LocationCard
                key={location.id}
                location={location}
                template={template}
                lastUpdate={location.updated_at}
                isSelected={selectedLocations.includes(location.id)}
                onSelect={handleLocationSelect}
              />
            )
          })}
        </div>
      )}

      {/* Modals */}
      <BulkActionModal
        isOpen={showActionModal}
        onClose={() => setShowActionModal(false)}
        action={currentAction}
        selectedLocations={locations.filter(loc => selectedLocations.includes(loc.id))}
        onConfirm={executeBulkAction}
      />

      {/* Operation Progress */}
      <BulkOperationProgress
        operation={operation}
        onClose={() => setOperation(null)}
      />
    </div>
  )
}