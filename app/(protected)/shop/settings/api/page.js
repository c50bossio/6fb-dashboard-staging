'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

const PERMISSION_SCOPES = [
  { value: 'read', label: 'Read Only', description: 'View data only, no modifications', color: 'blue' },
  { value: 'read_write', label: 'Read & Write', description: 'View and modify data', color: 'green' },
  { value: 'admin', label: 'Full Admin', description: 'Complete access including deletions', color: 'red' }
]

const API_RESOURCES = [
  { id: 'appointments', name: 'Appointments', description: 'Booking and scheduling data' },
  { id: 'customers', name: 'Customers', description: 'Customer information and profiles' },
  { id: 'services', name: 'Services', description: 'Service catalog and pricing' },
  { id: 'staff', name: 'Staff', description: 'Staff and barber management' },
  { id: 'analytics', name: 'Analytics', description: 'Business metrics and reports' },
  { id: 'inventory', name: 'Inventory', description: 'Product inventory management' }
]

export default function APIKeysPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const { user: _user } = useAuth()

  const [apiKeys, setApiKeys] = useState([])
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    scope: 'read',
    resources: [],
    expires_in_days: 365
  })
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)
  const [visibleKeys, setVisibleKeys] = useState({})
  const [copiedKey, setCopiedKey] = useState(null)

  useEffect(() => {
    if (_user) {
      loadAPIKeys()
    }
  }, [_user])

  const loadAPIKeys = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load API keys from database
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', _user.id)
        .order('created_at', { ascending: false })

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading API keys:', error)
        return
      }

      setApiKeys(data || [])
    } catch (err) {
      console.error('Failed to load API keys:', err)
      setMessage({ type: 'error', text: 'Failed to load API keys' })
    } finally {
      setLoading(false)
    }
  }

  const generateAPIKey = () => {
    // Generate a secure random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let key = 'sk_live_'
    for (let i = 0; i < 48; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

  const createAPIKey = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })

      if (!newKeyData.name || newKeyData.name.trim() === '') {
        setMessage({ type: 'error', text: 'Please provide a name for the API key' })
        setSaving(false)
        return
      }

      if (newKeyData.resources.length === 0) {
        setMessage({ type: 'error', text: 'Please select at least one resource' })
        setSaving(false)
        return
      }

      const supabase = createClient()
      const apiKey = generateAPIKey()

      // Calculate expiration date
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + newKeyData.expires_in_days)

      const newKey = {
        user_id: _user.id,
        name: newKeyData.name,
        key: apiKey,
        scope: newKeyData.scope,
        resources: newKeyData.resources,
        expires_at: expiresAt.toISOString(),
        last_used_at: null,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('api_keys')
        .insert([newKey])

      if (error) throw error

      setNewlyCreatedKey(apiKey)
      setShowNewKeyModal(false)
      setNewKeyData({ name: '', scope: 'read', resources: [], expires_in_days: 365 })

      // Reload keys
      await loadAPIKeys()

      setMessage({
        type: 'success',
        text: 'API key created successfully! Make sure to copy it now - you won\'t be able to see it again.'
      })

      // Clear success message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000)

    } catch (err) {
      console.error('Failed to create API key:', err)
      setMessage({ type: 'error', text: 'Failed to create API key. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const revokeAPIKey = async (keyId) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone and will immediately stop all integrations using this key.')) {
      return
    }

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', _user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'API key revoked successfully' })
      await loadAPIKeys()

      setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (err) {
      console.error('Failed to revoke API key:', err)
      setMessage({ type: 'error', text: 'Failed to revoke API key. Please try again.' })
    }
  }

  const toggleKeyVisibility = (keyId) => {
    setVisibleKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }))
  }

  const copyToClipboard = async (text, keyId) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(keyId)
      setTimeout(() => setCopiedKey(null), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  const maskKey = (key) => {
    if (!key) return ''
    const visible = key.substring(0, 10)
    const masked = '•'.repeat(38)
    return `${visible}${masked}`
  }

  const toggleResource = (resourceId) => {
    setNewKeyData(prev => ({
      ...prev,
      resources: prev.resources.includes(resourceId)
        ? prev.resources.filter(r => r !== resourceId)
        : [...prev.resources, resourceId]
    }))
  }

  const getScopeColor = (scope) => {
    const scopeObj = PERMISSION_SCOPES.find(s => s.value === scope)
    return scopeObj?.color || 'gray'
  }

  const getScopeBadgeClass = (scope) => {
    const color = getScopeColor(scope)
    const classes = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return classes[color] || classes.gray
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <KeyIcon className="h-8 w-8 text-olive-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage API keys for third-party integrations and programmatic access
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowNewKeyModal(true)}
            className="flex items-center px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create API Key
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-md border ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
          'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2" />}
            {message.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 mr-2" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <div className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-3 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Save Your API Key</h3>
              <p className="text-sm text-yellow-800 mb-3">
                Make sure to copy your API key now. You won't be able to see it again!
              </p>
              <div className="flex items-center gap-2 bg-white p-3 rounded border border-yellow-300">
                <code className="flex-1 text-sm font-mono text-gray-900">{newlyCreatedKey}</code>
                <button
                  onClick={() => copyToClipboard(newlyCreatedKey, 'new-key')}
                  className="p-2 text-yellow-700 hover:text-yellow-900 hover:bg-yellow-100 rounded"
                >
                  {copiedKey === 'new-key' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="mt-3 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                I've saved my key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Best Practices */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Security Best Practices</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Never share your API keys in public repositories or client-side code</li>
              <li>• Use the minimum required permissions for each key</li>
              <li>• Rotate keys regularly and revoke unused keys</li>
              <li>• Store keys securely using environment variables</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Keys List */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Your API Keys</h2>

          {apiKeys.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first API key</p>
              <button
                onClick={() => setShowNewKeyModal(true)}
                className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-olive-700 bg-olive-100 hover:bg-olive-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Create API Key
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{key.name}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScopeBadgeClass(key.scope)}`}>
                          {PERMISSION_SCOPES.find(s => s.value === key.scope)?.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          Created {new Date(key.created_at).toLocaleDateString()}
                        </span>
                        {key.last_used_at && (
                          <span className="text-xs text-gray-500">
                            Last used {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {key.resources?.map(resource => (
                          <span key={resource} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {API_RESOURCES.find(r => r.id === resource)?.name || resource}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      <code className="flex-1 text-sm font-mono text-gray-700">
                        {visibleKeys[key.id] ? key.key : maskKey(key.key)}
                      </code>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title={visibleKeys[key.id] ? 'Hide key' : 'Show key'}
                        >
                          {visibleKeys[key.id] ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(key.key, key.id)}
                          className="p-1 text-gray-500 hover:text-gray-700"
                          title="Copy to clipboard"
                        >
                          {copiedKey === key.id ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <ClipboardDocumentIcon className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeAPIKey(key.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                      title="Revoke key"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {key.expires_at && (
                    <p className="mt-2 text-xs text-gray-500">
                      Expires {new Date(key.expires_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create API Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Create New API Key</h2>
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Key Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Key Name *
                  </label>
                  <input
                    type="text"
                    value={newKeyData.name}
                    onChange={(e) => setNewKeyData({ ...newKeyData, name: e.target.value })}
                    placeholder="e.g., Production API, Mobile App, Webhook Integration"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    A descriptive name to help you identify this key
                  </p>
                </div>

                {/* Permission Scope */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permission Scope *
                  </label>
                  <div className="space-y-3">
                    {PERMISSION_SCOPES.map((scope) => (
                      <div
                        key={scope.value}
                        onClick={() => setNewKeyData({ ...newKeyData, scope: scope.value })}
                        className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                          newKeyData.scope === scope.value
                            ? 'border-olive-600 bg-olive-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            checked={newKeyData.scope === scope.value}
                            onChange={() => setNewKeyData({ ...newKeyData, scope: scope.value })}
                            className="mt-1 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300"
                          />
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{scope.label}</p>
                            <p className="text-sm text-gray-600">{scope.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource Access */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Resource Access * <span className="text-gray-500 font-normal">(Select at least one)</span>
                  </label>
                  <div className="space-y-2">
                    {API_RESOURCES.map((resource) => (
                      <div
                        key={resource.id}
                        className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={newKeyData.resources.includes(resource.id)}
                          onChange={() => toggleResource(resource.id)}
                          className="mt-1 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{resource.name}</p>
                          <p className="text-sm text-gray-600">{resource.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiration
                  </label>
                  <select
                    value={newKeyData.expires_in_days}
                    onChange={(e) => setNewKeyData({ ...newKeyData, expires_in_days: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                  >
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={365}>1 year</option>
                    <option value={730}>2 years</option>
                    <option value={9999}>Never</option>
                  </select>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setShowNewKeyModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  Cancel
                </button>
                <button
                  onClick={createAPIKey}
                  disabled={saving}
                  className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create API Key'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
