'use client'

import { CalendarIcon, DollarSignIcon, UsersIcon, BarChart3Icon as ChartBarIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { staffService } from '@/lib/staff-service'
import { formatCurrency } from '@/lib/utils'

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [processingPayroll, setProcessingPayroll] = useState(false)

  useEffect(() => {
    loadPayrollData()
  }, [])

  const loadPayrollData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await staffService.calculatePayrollData()
      setPayrollData(data)
    } catch (err) {
      setError(err.message)
      console.error('Error loading payroll data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayroll = async () => {
    setProcessingPayroll(true)
    try {
      // This would integrate with payment processing system
      
      // Placeholder for actual payroll processing
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Refresh data after processing
      await loadPayrollData()
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessingPayroll(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Payroll</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadPayrollData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Management</h1>
            <p className="text-gray-600 mt-1">
              Pay Period: {payrollData?.payPeriod.start} to {payrollData?.payPeriod.end}
            </p>
          </div>
          <Button 
            onClick={handleProcessPayroll}
            disabled={processingPayroll || payrollData?.payrollData.length === 0}
            className="bg-olive-600 hover:bg-olive-700"
          >
            {processingPayroll ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <DollarSignIcon className="h-4 w-4 mr-2" />
                Process Payroll
              </>
            )}
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollData?.totals.totalPending || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for payout
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Count</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payrollData?.totals.staffCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active staff with earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payrollData?.totals.totalBookings || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                This pay period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">YTD Earned</CardTitle>
              <ChartBarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(payrollData?.totals.totalEarned || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Year to date
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payroll Details */}
        <Card>
          <CardHeader>
            <CardTitle>Staff Payroll Details</CardTitle>
            <CardDescription>
              Individual earnings and payment breakdown for current pay period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payrollData?.payrollData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No pending payroll for this period</p>
                <Button variant="outline" onClick={loadPayrollData}>
                  Refresh Data
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {payrollData?.payrollData.map((staff) => (
                  <div key={staff.staffId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{staff.name}</h4>
                          <p className="text-sm text-gray-600">{staff.email}</p>
                        </div>
                        <Badge variant="secondary">
                          {staff.compensationModel.display}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>{staff.bookingsCount} bookings</span>
                        <span>Revenue: {formatCurrency(staff.revenue)}</span>
                        <span>YTD: {formatCurrency(staff.totalEarned)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {formatCurrency(staff.pendingAmount)}
                      </div>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}