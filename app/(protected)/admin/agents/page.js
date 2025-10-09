'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import ProtectedRoute from '@/components/ProtectedRoute'
import AgentCard from '@/components/admin/AgentCard'
import AgentConfigModal from '@/components/admin/AgentConfigModal'
import AgentTester from '@/components/admin/AgentTester'
import LoadingSpinner from '@/components/LoadingSpinner'
import {
  CpuChipIcon,
  ExclamationCircleIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function AgentManagementPage() {
  const { profile } = useAuth()
  const [agents, setAgents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [testingAgent, setTestingAgent] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEnabled, setFilterEnabled] = useState('all') // all, enabled, disabled

  // Check authorization
  const isAuthorized = profile?.role === 'SUPER_ADMIN' || profile?.role === 'SHOP_OWNER'

  useEffect(() => {
    if (isAuthorized) {
      loadAgents()
    }
  }, [isAuthorized])

  const loadAgents = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/agents')

      if (!response.ok) {
        throw new Error('Failed to load agents')
      }

      const data = await response.json()
      setAgents(data.agents || [])
    } catch (err) {
      setError(err.message || 'Failed to load agents')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditAgent = (agent) => {
    setSelectedAgent(agent)
  }

  const handleTestAgent = (agent) => {
    setTestingAgent(agent)
  }

  const handleViewStats = (agent) => {
    // TODO: Implement stats modal or navigate to stats page
    alert(`Stats for ${agent.name} - Coming soon!`)
  }

  const handleSaveAgent = (updatedAgent) => {
    // Update agent in list
    setAgents(prev => prev.map(a =>
      a.name === updatedAgent.name ? updatedAgent : a
    ))
  }

  // Filter agents
  const filteredAgents = agents.filter(agent => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.handoff_description?.toLowerCase().includes(searchTerm.toLowerCase())

    // Enabled filter
    const matchesEnabled = filterEnabled === 'all' ||
      (filterEnabled === 'enabled' && agent.enabled) ||
      (filterEnabled === 'disabled' && !agent.enabled)

    return matchesSearch && matchesEnabled
  })

  // Unauthorized access
  if (!isAuthorized) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <ExclamationCircleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-card-foreground mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Only Super Admins and Shop Owners can access the agent management panel.
            </p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CpuChipIcon className="w-10 h-10 text-indigo-600 mr-4" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground">
                    AgentKit Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    Configure and manage your AI agents without code changes
                  </p>
                </div>
              </div>
              <button
                onClick={loadAgents}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-card hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Refresh
              </button>
            </div>

            {/* Search and Filters */}
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search agents..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-card placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>

              {/* Filter by status */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={filterEnabled}
                  onChange={(e) => setFilterEnabled(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                >
                  <option value="all">All Agents</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                  <button
                    onClick={loadAgents}
                    className="mt-3 text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent Grid */}
          {!isLoading && !error && (
            <>
              {filteredAgents.length === 0 ? (
                <div className="text-center py-12">
                  <CpuChipIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-card-foreground mb-2">
                    No agents found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {searchTerm || filterEnabled !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'No agents available'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats Summary */}
                  <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <div className="bg-white dark:bg-card overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <CpuChipIcon className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                                Total Agents
                              </dt>
                              <dd className="text-lg font-medium text-gray-900 dark:text-card-foreground">
                                {agents.length}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-card overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-6 w-6 text-green-500 font-bold">✓</div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                                Enabled
                              </dt>
                              <dd className="text-lg font-medium text-gray-900 dark:text-card-foreground">
                                {agents.filter(a => a.enabled).length}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-card overflow-hidden shadow rounded-lg">
                      <div className="p-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-6 w-6 text-gray-400 font-bold">✗</div>
                          </div>
                          <div className="ml-5 w-0 flex-1">
                            <dl>
                              <dt className="text-sm font-medium text-gray-500 dark:text-gray-300 truncate">
                                Disabled
                              </dt>
                              <dd className="text-lg font-medium text-gray-900 dark:text-card-foreground">
                                {agents.filter(a => !a.enabled).length}
                              </dd>
                            </dl>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Agent Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredAgents.map((agent) => (
                      <AgentCard
                        key={agent.name}
                        agent={agent}
                        onEdit={handleEditAgent}
                        onTest={handleTestAgent}
                        onViewStats={handleViewStats}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {selectedAgent && (
          <AgentConfigModal
            agent={selectedAgent}
            onClose={() => setSelectedAgent(null)}
            onSave={handleSaveAgent}
          />
        )}

        {testingAgent && (
          <AgentTester
            agent={testingAgent}
            onClose={() => setTestingAgent(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  )
}
