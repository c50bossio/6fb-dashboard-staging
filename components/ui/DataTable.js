'use client'

/**
 * Standardized DataTable components for consistent data display across the dashboard
 * Replaces scattered table implementations with reusable, configurable components
 */

import { 
  ChevronUpDownIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import React, { useState, useMemo } from 'react'

export function DataTable({ 
  data = [],
  columns = [],
  searchable = true,
  sortable = true,
  pagination = true,
  pageSize = 10,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon: EmptyIcon,
  className = '',
  onRowClick,
  actions = []
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = useMemo(() => {
    if (!searchTerm) return data
    
    return data.filter(row => 
      columns.some(column => {
        const value = column.accessor ? row[column.accessor] : ''
        return String(value).toLowerCase().includes(searchTerm.toLowerCase())
      })
    )
  }, [data, searchTerm, columns])

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortable) return filteredData
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortColumn, sortDirection, sortable])

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData
    
    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = pagination ? Math.ceil(sortedData.length / pageSize) : 1

  const handleSort = (column) => {
    if (!column.sortable && sortable) return
    
    if (sortColumn === column.accessor) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column.accessor)
      setSortDirection('asc')
    }
  }

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const renderCell = (row, column) => {
    if (column.render) {
      return column.render(row[column.accessor], row)
    }
    return row[column.accessor]
  }

  const getSortIcon = (column) => {
    if (!sortable || column.sortable === false) return null
    
    if (sortColumn !== column.accessor) {
      return <ChevronUpDownIcon className="h-4 w-4 text-gray-400" />
    }
    
    return sortDirection === 'asc' 
      ? <ChevronUpIcon className="h-4 w-4 text-olive-600" />
      : <ChevronDownIcon className="h-4 w-4 text-olive-600" />
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow ${className}`}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Search Header */}
      {searchable && (
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {paginatedData.length === 0 ? (
        <div className="p-12 text-center">
          {EmptyIcon && <EmptyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />}
          <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
          <p className="text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column, index) => (
                  <th
                    key={column.accessor || index}
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                      sortable && column.sortable !== false ? 'cursor-pointer hover:bg-gray-100' : ''
                    }`}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-1">
                      <span className="truncate">{column.header}</span>
                      {getSortIcon(column)}
                    </div>
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column, colIndex) => (
                    <td
                      key={column.accessor || colIndex}
                      className="px-6 py-4 text-sm text-gray-900 max-w-0">
                    >
                      <div className="truncate max-w-[200px]">{renderCell(row, column)}</div>
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {actions.map((action, actionIndex) => (
                          <button
                            key={actionIndex}
                            onClick={(e) => {
                              e.stopPropagation()
                              action.onClick(row)
                            }}
                            className={`p-2 rounded-lg transition-colors ${action.className || 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                            title={action.label}
                          >
                            <action.icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1
                const isCurrentPage = page === currentPage
                
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        isCurrentPage
                          ? 'bg-olive-600 text-white'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  )
                } else if (
                  (page === currentPage - 2 && currentPage > 3) ||
                  (page === currentPage + 2 && currentPage < totalPages - 2)
                ) {
                  return <span key={page} className="px-2 text-gray-400">...</span>
                }
                
                return null
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple table component for basic data display
 */
export function SimpleTable({ 
  data = [], 
  columns = [], 
  className = '',
  onRowClick 
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            {columns.map((column, index) => (
              <th
                key={column.accessor || index}
                className="px-4 py-3 text-left text-sm font-medium text-gray-900"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={row.id || rowIndex}
              className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.accessor || colIndex}
                  className="px-4 py-3 text-sm text-gray-900 max-w-0">
                >
                  <div className="truncate max-w-[200px]">{column.render ? column.render(row[column.accessor], row) : row[column.accessor]}</div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Common table action buttons
 */
export const TableActions = {
  view: (onClick) => ({
    icon: EyeIcon,
    label: 'View',
    onClick,
    className: 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'
  }),
  edit: (onClick) => ({
    icon: PencilIcon,
    label: 'Edit',
    onClick,
    className: 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
  }),
  delete: (onClick) => ({
    icon: TrashIcon,
    label: 'Delete',
    onClick,
    className: 'text-red-400 hover:text-red-600 hover:bg-red-50'
  })
}