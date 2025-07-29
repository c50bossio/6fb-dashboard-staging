'use client'

import { useState, useMemo } from 'react'
import { 
  ChevronUpIcon, 
  ChevronDownIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'
import { Card, CardHeader, CardContent } from './Card'
import { Input } from './Input'
import { Button } from './Button'
import { Badge } from './Badge'
import { Avatar } from './Avatar'
import { Skeleton } from './Loading'
import { cn, formatDate, formatCurrency } from '../../lib/utils'

// Basic Table Components
const Table = ({ children, className, ...props }) => (
  <div className="overflow-hidden">
    <table className={cn('min-w-full divide-y divide-gray-200 dark:divide-gray-700', className)} {...props}>
      {children}
    </table>
  </div>
)

const TableHeader = ({ children, className, ...props }) => (
  <thead className={cn('bg-gray-50 dark:bg-gray-800', className)} {...props}>
    {children}
  </thead>
)

const TableBody = ({ children, className, ...props }) => (
  <tbody className={cn('bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700', className)} {...props}>
    {children}
  </tbody>
)

const TableRow = ({ children, className, clickable = false, onClick, ...props }) => (
  <tr 
    className={cn(
      'transition-colors',
      clickable && 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer',
      className
    )} 
    onClick={onClick}
    {...props}
  >
    {children}
  </tr>
)

const TableHead = ({ 
  children, 
  className, 
  sortable = false, 
  sortDirection, 
  onSort,
  align = 'left',
  ...props 
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  return (
    <th 
      className={cn(
        'px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        alignClasses[align],
        sortable && 'cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 select-none',
        className
      )} 
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        {sortable && (
          <span className="flex-shrink-0">
            {sortDirection === 'asc' ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronUpDownIcon className="w-4 h-4 opacity-50" />
            )}
          </span>
        )}
      </div>
    </th>
  )
}

const TableCell = ({ 
  children, 
  className, 
  align = 'left',
  ...props 
}) => {
  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  }

  return (
    <td 
      className={cn(
        'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white',
        alignClasses[align],
        className
      )} 
      {...props}
    >
      {children}
    </td>
  )
}

// Advanced Data Table Component
const DataTable = ({
  data = [],
  columns = [],
  title,
  description,
  loading = false,
  searchable = true,
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  actions,
  className,
  emptyMessage = 'No data available',
  searchPlaceholder = 'Search...',
  onRowClick
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null })
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState({})

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data]

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(item =>
        columns.some(column => {
          const value = getNestedValue(item, column.accessorKey)
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(item => {
          const itemValue = getNestedValue(item, key)
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
        })
      }
    })

    return filtered
  }, [data, searchTerm, filters, columns])

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData

    return [...filteredData].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.key)
      const bValue = getNestedValue(b, sortConfig.key)

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredData, sortConfig])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    return sortedData.slice(startIndex, startIndex + pageSize)
  }, [sortedData, currentPage, pageSize, pagination])

  const totalPages = Math.ceil(sortedData.length / pageSize)

  const handleSort = (key) => {
    if (!sortable) return

    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((value, key) => value?.[key], obj)
  }

  const renderCell = (column, item) => {
    const value = getNestedValue(item, column.accessorKey)

    if (column.cell) {
      return column.cell({ value, row: item })
    }

    // Auto-format common data types
    if (column.type === 'currency') {
      return formatCurrency(value)
    }
    if (column.type === 'date') {
      return formatDate(value)
    }
    if (column.type === 'badge') {
      return <Badge variant={column.badgeVariant}>{value}</Badge>
    }
    if (column.type === 'avatar') {
      return <Avatar src={value} name={item.name} size="sm" />
    }

    return value
  }

  return (
    <Card className={className}>
      {/* Header */}
      {(title || description || searchable || actions) && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              {title && <h3 className="text-lg font-semibold">{title}</h3>}
              {description && <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>}
            </div>
            
            <div className="flex items-center space-x-2">
              {searchable && (
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="w-4 h-4" />}
                  className="w-64"
                />
              )}
              
              {filterable && (
                <Button variant="outline" size="sm">
                  <FunnelIcon className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              )}
              
              {actions}
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {loading ? (
          <TableSkeleton columns={columns.length} rows={pageSize} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead
                        key={column.accessorKey}
                        sortable={sortable && column.sortable !== false}
                        sortDirection={sortConfig.key === column.accessorKey ? sortConfig.direction : null}
                        onSort={() => handleSort(column.accessorKey)}
                        align={column.align}
                      >
                        {column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-12">
                        <div className="text-gray-500 dark:text-gray-400">
                          {emptyMessage}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.map((item, index) => (
                      <TableRow
                        key={item.id || index}
                        clickable={!!onRowClick}
                        onClick={() => onRowClick?.(item)}
                      >
                        {columns.map((column) => (
                          <TableCell
                            key={column.accessorKey}
                            align={column.align}
                          >
                            {renderCell(column, item)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// Table skeleton loader
const TableSkeleton = ({ columns = 5, rows = 5 }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: columns }).map((_, i) => (
            <TableHead key={i}>
              <Skeleton className="h-4 w-20" />
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: columns }).map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-4 w-24" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)

export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  DataTable,
  TableSkeleton
}