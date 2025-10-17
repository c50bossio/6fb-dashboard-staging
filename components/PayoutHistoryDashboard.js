'use client'

import { format, formatDistance, parseISO } from 'date-fns'
import { 
  Calendar, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import PayoutStatusIndicator from './PayoutStatusIndicator'
import PayoutTransactionDetails from './PayoutTransactionDetails'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Comprehensive Payout History Dashboard
 * Features:
 * - Advanced filtering and search
 * - Real-time status updates
 * - Summary statistics
 * - Export capabilities
 * - Timeline view
 * - Mobile-responsive design
 */
export default function PayoutHistoryDashboard({ 
  barbershopId, 
  currentUserRole = 'shop_owner',
  initialFilters = {},
  onPayoutSelect = null 
}) {
  // State Management
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [selectedPayout, setSelectedPayout] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Filter States
  const [filters, setFilters] = useState({
    barber_id: initialFilters.barber_id || '',
    status: initialFilters.status || '',
    method: initialFilters.method || '',
    date_from: initialFilters.date_from || '',
    date_to: initialFilters.date_to || '',
    search: initialFilters.search || '',
    sort: initialFilters.sort || 'created_at_desc'
  })

  // Pagination States
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    has_more: false
  })

  // UI States
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState('table') // 'table' | 'timeline'
  const [barbers, setBarbers] = useState([])

  // Load barbers for filter dropdown
  useEffect(() => {
    async function loadBarbers() {
      try {
        const response = await fetch(`/api/barbershops/${barbershopId}/staff`)
        if (response.ok) {
          const data = await response.json()
          setBarbers(data.staff || [])
        }
      } catch (error) {
        console.error('Error loading barbers:', error)
      }
    }
    if (barbershopId) {
      loadBarbers()
    }
  }, [barbershopId])

  // Load payout history
  const loadPayoutHistory = useCallback(async (resetPagination = false) => {
    try {
      setLoading(resetPagination)
      setError(null)

      const queryParams = new URLSearchParams({
        ...filters,
        limit: pagination.limit,
        offset: resetPagination ? 0 : pagination.offset,
        include_status_history: 'true',
        include_metadata: 'true'
      })

      // Remove empty filter values
      Object.keys(filters).forEach(key => {
        if (!filters[key]) {
          queryParams.delete(key)
        }
      })

      const response = await fetch(`/api/payout-history?${queryParams}`)
      
      if (!response.ok) {
        throw new Error(`Failed to load payout history: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setPayouts(resetPagination ? data.data.payouts : [...payouts, ...data.data.payouts])
        setSummary(data.data.summary)
        setPagination(prev => ({
          ...prev,
          offset: resetPagination ? data.data.pagination.limit : prev.offset + data.data.pagination.limit,
          total: data.data.pagination.total,
          has_more: data.data.pagination.has_more
        }))
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('Error loading payout history:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, pagination.limit, pagination.offset, payouts])

  // Initial load and filter changes
  useEffect(() => {
    if (barbershopId) {
      loadPayoutHistory(true)
    }
  }, [barbershopId, filters])

  // Refresh functionality
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPayoutHistory(true)
  }, [loadPayoutHistory])

  // Filter handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, offset: 0 })) // Reset pagination
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      barber_id: '',
      status: '',
      method: '',
      date_from: '',
      date_to: '',
      search: '',
      sort: 'created_at_desc'
    })
  }, [])

  // Export functionality
  const handleExport = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        export: 'csv',
        limit: 1000 // Higher limit for export
      })

      const response = await fetch(`/api/payout-history/export?${queryParams}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payout-history-${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    }
  }, [filters])

  // Status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: 'outline', icon: Clock, className: 'text-yellow-600 border-yellow-600' },
      processing: { variant: 'outline', icon: RefreshCw, className: 'text-blue-600 border-blue-600' },
      completed: { variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-800 border-green-300' },
      failed: { variant: 'destructive', icon: XCircle, className: 'bg-red-100 text-red-800 border-red-300' },
      cancelled: { variant: 'outline', icon: XCircle, className: 'text-gray-600 border-gray-600' },
      reversed: { variant: 'outline', icon: AlertCircle, className: 'text-orange-600 border-orange-600' }
    }
    
    const config = statusConfig[status] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <Badge variant={config.variant} className={`${config.className} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {status}
      </Badge>
    )
  }

  // Method badge styling
  const getMethodBadge = (method) => {
    const methodConfig = {
      stripe_transfer: { label: 'Stripe Transfer', className: 'bg-purple-100 text-purple-800' },
      manual: { label: 'Manual', className: 'bg-gray-100 text-gray-800' },
      cash: { label: 'Cash', className: 'bg-green-100 text-green-800' },
      check: { label: 'Check', className: 'bg-blue-100 text-blue-800' },
      venmo: { label: 'Venmo', className: 'bg-indigo-100 text-indigo-800' },
      cashapp: { label: 'Cash App', className: 'bg-emerald-100 text-emerald-800' }
    }
    
    const config = methodConfig[method] || { label: method, className: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    )
  }

  // Summary statistics component
  const SummaryStats = () => {
    if (!summary) return null

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold">{summary.total_payouts}</p>
              </div>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold">${summary.total_amount?.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{summary.success_rate}%</p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Processing</p>
                <p className="text-2xl font-bold">{summary.average_processing_time_hours?.toFixed(1)}h</p>
              </div>
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter panel component
  const FilterPanel = () => {
    if (!showFilters) return null

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Barber</label>
              <Select value={filters.barber_id} onValueChange={(value) => handleFilterChange('barber_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All barbers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All barbers</SelectItem>
                  {barbers.map(barber => (
                    <SelectItem key={barber.id} value={barber.id}>
                      {barber.full_name || barber.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Method</label>
              <Select value={filters.method} onValueChange={(value) => handleFilterChange('method', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All methods</SelectItem>
                  <SelectItem value="stripe_transfer">Stripe Transfer</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="cashapp">Cash App</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <Select value={filters.sort} onValueChange={(value) => handleFilterChange('sort', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at_desc">Newest First</SelectItem>
                  <SelectItem value="created_at_asc">Oldest First</SelectItem>
                  <SelectItem value="amount_desc">Highest Amount</SelectItem>
                  <SelectItem value="amount_asc">Lowest Amount</SelectItem>
                  <SelectItem value="barber_name_asc">Barber Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">From Date</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">To Date</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Search</label>
              <Input
                placeholder="Search barber name, reference number..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <Button variant="outline" onClick={clearFilters}>
              Clear All
            </Button>
            <Button onClick={() => setShowFilters(false)}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Main table component
  const PayoutTable = () => {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payout History</CardTitle>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Barber</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.payout_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payout.barber_name}</p>
                        {payout.reference_number && (
                          <p className="text-sm text-muted-foreground">
                            Ref: {payout.reference_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">${payout.amount}</p>
                        {(payout.service_commission > 0 || payout.product_commission > 0 || payout.tier_bonus > 0) && (
                          <div className="text-xs text-muted-foreground">
                            {payout.service_commission > 0 && <span>Service: ${payout.service_commission}</span>}
                            {payout.product_commission > 0 && <span className="ml-1">Product: ${payout.product_commission}</span>}
                            {payout.tier_bonus > 0 && <span className="ml-1">Bonus: ${payout.tier_bonus}</span>}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getMethodBadge(payout.payout_method)}</TableCell>
                    <TableCell>
                      <PayoutStatusIndicator 
                        status={payout.status}
                        lastUpdate={payout.latest_status_update}
                        updateCount={payout.status_count}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{format(parseISO(payout.created_at), 'MMM dd, yyyy')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(payout.created_at), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {payout.completed_at ? (
                        <div>
                          <p>{format(parseISO(payout.completed_at), 'MMM dd, yyyy')}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistance(parseISO(payout.created_at), parseISO(payout.completed_at))}
                          </p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPayout(payout)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {pagination.has_more && (
            <div className="mt-4 text-center">
              <Button onClick={() => loadPayoutHistory(false)} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p>Error loading payout history: {error}</p>
          <Button onClick={() => loadPayoutHistory(true)} className="mt-4">
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payout History</h2>
          <p className="text-muted-foreground">
            Track and manage all commission payouts and transfers
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="timeline">Timeline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Statistics */}
      <SummaryStats />

      {/* Filter Panel */}
      <FilterPanel />

      {/* Main Content */}
      {loading && payouts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p>Loading payout history...</p>
          </div>
        </Card>
      ) : (
        <>
          {viewMode === 'table' ? (
            <PayoutTable />
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              Timeline view coming soon...
            </div>
          )}
        </>
      )}

      {/* Transaction Details Modal */}
      {selectedPayout && (
        <PayoutTransactionDetails
          payout={selectedPayout}
          onClose={() => setSelectedPayout(null)}
          onStatusUpdate={handleRefresh}
          canEdit={['admin', 'shop_owner'].includes(currentUserRole)}
        />
      )}
    </div>
  )
}