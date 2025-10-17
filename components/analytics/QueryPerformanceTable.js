'use client'

import { useState } from 'react'
import {
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function QueryPerformanceTable({ queries, pagination, onPageChange, onExport }) {
  const [sortField, setSortField] = useState('timestamp')
  const [sortOrder, setSortOrder] = useState('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedQuery, setSelectedQuery] = useState(null)

  // Get unique agents for filter dropdown
  const uniqueAgents = [...new Set(queries.map(q => q.agent_used))].sort()

  // Filter queries
  const filteredQueries = queries.filter(query => {
    if (searchQuery && !query.query.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (agentFilter && query.agent_used !== agentFilter) {
      return false
    }
    if (statusFilter && query.status !== statusFilter) {
      return false
    }
    return true
  })

  // Sort queries
  const sortedQueries = [...filteredQueries].sort((a, b) => {
    let aVal = a[sortField]
    let bVal = b[sortField]

    // Handle different data types
    if (sortField === 'timestamp') {
      aVal = new Date(aVal).getTime()
      bVal = new Date(bVal).getTime()
    } else if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1
    } else {
      return aVal < bVal ? 1 : -1
    }
  })

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleExport = () => {
    if (onExport) {
      onExport({
        search: searchQuery,
        agent: agentFilter,
        status: statusFilter
      })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Query Performance Log</h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed performance data for all AgentKit queries
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search queries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Agent Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent appearance-none"
            >
              <option value="">All Agents</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>
                  {cleanAgentName(agent)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>
        </div>

        {/* Active Filters */}
        {(searchQuery || agentFilter || statusFilter) && (
          <div className="mt-4 flex items-center space-x-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                Search: {searchQuery}
                <button onClick={() => setSearchQuery('')} className="ml-2">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {agentFilter && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Agent: {cleanAgentName(agentFilter)}
                <button onClick={() => setAgentFilter('')} className="ml-2">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {statusFilter && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Status: {statusFilter}
                <button onClick={() => setStatusFilter('')} className="ml-2">
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortableHeader
                label="Timestamp"
                field="timestamp"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Query"
                field="query"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Agent"
                field="agent_used"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Response Time"
                field="response_time_ms"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Tokens"
                field="tokens_used"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Cost"
                field="cost_usd"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label="Status"
                field="status"
                currentField={sortField}
                currentOrder={sortOrder}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedQueries.map((query) => (
              <tr
                key={query.id}
                onClick={() => setSelectedQuery(selectedQuery?.id === query.id ? null : query)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTimestamp(query.timestamp)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {query.query}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800">
                    {cleanAgentName(query.agent_used)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={getResponseTimeColor(query.response_time_ms)}>
                    {formatResponseTime(query.response_time_ms)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {query.tokens_used?.toLocaleString() || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                  ${query.cost_usd?.toFixed(4) || '0.0000'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getStatusBadge(query.status)}>
                    {query.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {sortedQueries.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No queries found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || agentFilter || statusFilter
                ? 'Try adjusting your filters'
                : 'No query data available yet'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {sortedQueries.length} of {pagination.total} queries
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Query Detail Modal */}
      {selectedQuery && (
        <QueryDetailModal
          query={selectedQuery}
          onClose={() => setSelectedQuery(null)}
        />
      )}
    </div>
  )
}

// Sortable header component
function SortableHeader({ label, field, currentField, currentOrder, onSort }) {
  const isActive = currentField === field

  return (
    <th
      onClick={() => onSort(field)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUpIcon className="h-4 w-4" />
          ) : (
            <ChevronDownIcon className="h-4 w-4" />
          )
        ) : (
          <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </th>
  )
}

// Query detail modal
function QueryDetailModal({ query, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Query Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Query Text */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Query</label>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-900">{query.query}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Agent Used</label>
              <p className="text-sm text-gray-900">{cleanAgentName(query.agent_used)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
              <span className={getStatusBadge(query.status)}>{query.status}</span>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Response Time</label>
              <p className="text-sm text-gray-900">{formatResponseTime(query.response_time_ms)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tokens Used</label>
              <p className="text-sm text-gray-900">{query.tokens_used?.toLocaleString() || 0}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cost</label>
              <p className="text-sm font-medium text-green-600">${query.cost_usd?.toFixed(4) || '0.0000'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Timestamp</label>
              <p className="text-sm text-gray-900">{formatTimestamp(query.timestamp, true)}</p>
            </div>
            {query.ai_provider && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Provider</label>
                <p className="text-sm text-gray-900">{query.ai_provider}</p>
              </div>
            )}
            {query.model_used && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Model</label>
                <p className="text-sm text-gray-900">{query.model_used}</p>
              </div>
            )}
          </div>

          {/* Handoffs */}
          {query.handoffs && query.handoffs.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Handoffs</label>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center space-x-2">
                  {query.handoffs.map((handoff, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="text-sm text-gray-900">{handoff}</span>
                      {index < query.handoffs.length - 1 && (
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {query.error_message && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Error Message</label>
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-sm text-red-900">{query.error_message}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Utility functions
function cleanAgentName(name) {
  if (!name) return 'Unknown'
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace('Agent', '')
    .trim()
}

function formatTimestamp(timestamp, full = false) {
  const date = new Date(timestamp)
  if (full) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatResponseTime(ms) {
  if (!ms) return '0ms'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function getResponseTimeColor(ms) {
  if (ms < 5000) return 'text-green-600 font-medium'
  if (ms < 10000) return 'text-blue-600 font-medium'
  if (ms < 15000) return 'text-amber-600 font-medium'
  return 'text-red-600 font-medium'
}

function getStatusBadge(status) {
  const badges = {
    success: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800',
    error: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800',
    timeout: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800'
  }
  return badges[status] || 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800'
}
