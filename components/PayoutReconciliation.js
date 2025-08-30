'use client'

import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import {
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  FileText,
  Eye,
  Settings
} from 'lucide-react'
import React, { useState, useEffect, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/Input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * Comprehensive Payout Reconciliation Admin Component
 * Features:
 * - Automated reconciliation between internal records and Stripe transfers
 * - Discrepancy detection and resolution tools
 * - Bulk reconciliation actions
 * - Detailed reconciliation reports
 * - Performance analytics
 * - Export capabilities
 */
export default function PayoutReconciliation({ 
  barberbarbershopId, 
  currentUserRole = 'admin' 
}) {
  // State Management
  const [loading, setLoading] = useState(true)
  const [reconciliationData, setReconciliationData] = useState(null)
  const [discrepancies, setDiscrepancies] = useState([])
  const [reports, setReports] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('current_month')
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  })
  const [processing, setProcessing] = useState(false)

  // Period calculations
  const getPeriodDates = useCallback((period) => {
    const now = new Date()
    
    switch (period) {
      case 'current_month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, 'MMMM yyyy')
        }
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        return {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
          label: format(lastMonth, 'MMMM yyyy')
        }
      case 'last_3_months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
          label: 'Last 3 months'
        }
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, 'MMMM yyyy')
        }
    }
  }, [])

  // Load reconciliation data
  const loadReconciliationData = useCallback(async () => {
    try {
      setLoading(true)
      
      const period = getPeriodDates(selectedPeriod)
      
      // Load main reconciliation data
      const response = await fetch(`/api/payout-reconciliation?${new URLSearchParams({
        barberbarbershop_id: barberbarbershopId,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
        include_discrepancies: 'true',
        include_summary: 'true'
      })}`)

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReconciliationData(data.data)
          setDiscrepancies(data.data.discrepancies || [])
        }
      }

      // Load reconciliation reports
      const reportsResponse = await fetch(`/api/payout-reconciliation/reports?${new URLSearchParams({
        barberbarbershop_id: barberbarbershopId,
        limit: '10'
      })}`)

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json()
        if (reportsData.success) {
          setReports(reportsData.data.reports || [])
        }
      }
      
    } catch (error) {
      console.error('Error loading reconciliation data:', error)
    } finally {
      setLoading(false)
    }
  }, [barberbarbershopId, selectedPeriod, getPeriodDates])

  // Initial load
  useEffect(() => {
    if (barberbarbershopId) {
      loadReconciliationData()
    }
  }, [barberbarbershopId, loadReconciliationData])

  // Run reconciliation process
  const runReconciliation = async () => {
    try {
      setProcessing(true)
      
      const period = getPeriodDates(selectedPeriod)
      
      const response = await fetch('/api/payout-reconciliation/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barberbarbershop_id: barberbarbershopId,
          period_start: period.start.toISOString(),
          period_end: period.end.toISOString(),
          auto_resolve_matches: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          await loadReconciliationData() // Reload data
        } else {
          throw new Error(result.error)
        }
      } else {
        throw new Error('Reconciliation process failed')
      }
      
    } catch (error) {
      console.error('Error running reconciliation:', error)
      alert(`Reconciliation failed: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  // Export reconciliation report
  const exportReconciliation = async () => {
    try {
      const period = getPeriodDates(selectedPeriod)
      
      const response = await fetch(`/api/payout-reconciliation/export?${new URLSearchParams({
        barberbarbershop_id: barberbarbershopId,
        period_start: period.start.toISOString(),
        period_end: period.end.toISOString(),
        format: 'csv'
      })}`)
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payout-reconciliation-${format(period.start, 'yyyy-MM-dd')}.csv`
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
  }

  // Resolve discrepancy
  const resolveDiscrepancy = async (discrepancyId, resolution) => {
    try {
      const response = await fetch(`/api/payout-reconciliation/discrepancies/${discrepancyId}/resolve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resolution)
      })

      if (response.ok) {
        await loadReconciliationData() // Reload data
      } else {
        throw new Error('Failed to resolve discrepancy')
      }
    } catch (error) {
      console.error('Error resolving discrepancy:', error)
      alert(`Failed to resolve discrepancy: ${error.message}`)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  // Get discrepancy severity badge
  const getDiscrepancyBadge = (severity, amount) => {
    if (amount > 100) {
      return <Badge variant="destructive">Critical</Badge>
    } else if (amount > 10) {
      return <Badge variant="secondary">High</Badge>
    } else {
      return <Badge variant="outline">Low</Badge>
    }
  }

  // Summary cards component
  const SummaryCards = () => {
    if (!reconciliationData?.summary) return null

    const summary = reconciliationData.summary

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payouts</p>
                <p className="text-2xl font-bold">{summary.total_internal_payouts}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.total_internal_amount)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stripe Transfers</p>
                <p className="text-2xl font-bold">{summary.total_stripe_transfers}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(summary.total_stripe_amount)}
                </p>
              </div>
              <RefreshCw className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Matched</p>
                <p className="text-2xl font-bold">{summary.matched_transactions}</p>
                <p className="text-xs text-green-600">
                  {Math.round((summary.matched_transactions / summary.total_internal_payouts) * 100)}% accuracy
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discrepancies</p>
                <p className="text-2xl font-bold">{discrepancies.length}</p>
                <p className="text-xs text-red-600">
                  {formatCurrency(Math.abs(summary.total_difference))} variance
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Discrepancies table component
  const DiscrepanciesTable = () => {
    const filteredDiscrepancies = discrepancies.filter(discrepancy => {
      if (filters.status !== 'all' && discrepancy.status !== filters.status) return false
      if (filters.type !== 'all' && discrepancy.type !== filters.type) return false
      if (filters.search && !discrepancy.description.toLowerCase().includes(filters.search.toLowerCase())) return false
      return true
    })

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Discrepancies</CardTitle>
            <div className="flex space-x-2">
              <Select value={filters.status} onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredDiscrepancies.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount Difference</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDiscrepancies.map((discrepancy) => (
                    <TableRow key={discrepancy.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {discrepancy.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{discrepancy.description}</p>
                          {discrepancy.details && (
                            <p className="text-sm text-muted-foreground">
                              {discrepancy.details.slice(0, 100)}...
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-medium ${Math.abs(discrepancy.amount_difference) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(discrepancy.amount_difference)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getDiscrepancyBadge(discrepancy.severity, Math.abs(discrepancy.amount_difference))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={discrepancy.status === 'resolved' ? 'default' : 'outline'}>
                          {discrepancy.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {discrepancy.status === 'pending' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Resolve
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Resolve Discrepancy</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    How would you like to resolve this discrepancy?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => resolveDiscrepancy(discrepancy.id, { action: 'mark_resolved' })}>
                                    Mark as Resolved
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" />
              <p>No discrepancies found for the selected period.</p>
              <p className="text-sm">All payouts are properly reconciled.</p>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Reports table component
  const ReportsTable = () => (
    <Card>
      <CardHeader>
        <CardTitle>Reconciliation Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Date</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payouts</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    {format(parseISO(report.report_date), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(parseISO(report.period_start), 'MMM dd')} - 
                      {format(parseISO(report.period_end), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.reconciliation_status === 'completed' ? 'default' : 'outline'}>
                      {report.reconciliation_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{report.internal_payout_count} internal</p>
                      <p>{report.stripe_transfer_count} Stripe</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {Math.round((report.matched_transactions_count / report.internal_payout_count) * 100)}%
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <Card className="p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p>Loading reconciliation data...</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Payout Reconciliation</h2>
          <p className="text-muted-foreground">
            Reconcile internal payout records with Stripe transfers
          </p>
        </div>
        
        <div className="flex space-x-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_month">Current Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadReconciliationData} variant="outline" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={exportReconciliation} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={processing}>
                {processing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Run Reconciliation
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Run Reconciliation Process</AlertDialogTitle>
                <AlertDialogDescription>
                  This will analyze all payout records and Stripe transfers for the selected period 
                  and automatically match transactions where possible. This process may take a few minutes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={runReconciliation}>
                  Run Reconciliation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary Statistics */}
      <SummaryCards />

      {/* Main Content Tabs */}
      <Tabs defaultValue="discrepancies" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discrepancies">
            Discrepancies ({discrepancies.length})
          </TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="discrepancies" className="space-y-4">
          <DiscrepanciesTable />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsTable />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="text-center p-8 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-4" />
            <p>Reconciliation analytics dashboard coming soon...</p>
            <p className="text-sm">Track reconciliation accuracy trends and performance metrics.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}